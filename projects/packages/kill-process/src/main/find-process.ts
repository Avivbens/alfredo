import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import psList from 'ps-list';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { CallbackPayload } from '../models/callback-payload.model';
import type { ProcessWithBattery } from '../models/process-with-battery.model';
import { getSortByResource } from '../models/sort-by-resources.model';
import { fetchBatteryData } from '../services/battery.service';
import { mergeProcessesWithBattery } from '../services/process-merger.service';
import { searchProcess } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('kill-process'));

  const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });

  const fuzzyThreshold: number = alfredClient.env.getEnv(Variables.FUZZY_THRESHOLD, {
    defaultValue: 0.4,
    parser: (input) => Number(input) / 10,
  });

  const rerunInterval: number = alfredClient.env.getEnv(Variables.RERUN_INTERVAL, {
    defaultValue: 1,
    parser: (input) => Math.round(Number(input)),
  });

  const rerunIntervalResources: number = alfredClient.env.getEnv(Variables.RERUN_INTERVAL_RESOURCES, {
    defaultValue: 3,
    parser: (input) => Math.round(Number(input)),
  });

  /**
   * Prepare inputs
   * Sorting & force kill
   */
  const [forceKill, order, searchTerm] = alfredClient.inputs;
  const shouldForceKill: boolean = forceKill === 'true';
  const sortOrder = getSortByResource(order ?? 'none');

  const rerun = sortOrder === 'none' ? rerunInterval : rerunIntervalResources;

  try {
    const processes = await psList();

    // Conditionally fetch battery data only when sorting by battery
    let processesWithBattery: ProcessWithBattery[];
    let batteryError: string | undefined;

    if (sortOrder === 'battery') {
      const batteryResult = await fetchBatteryData();

      if (!batteryResult.success) {
        batteryError = batteryResult.error;
      }

      processesWithBattery = mergeProcessesWithBattery(processes, batteryResult.data);
    } else {
      processesWithBattery = processes.map((p) => ({ ...p }));
    }

    const filteredProcesses = await searchProcess(
      processesWithBattery,
      searchTerm ?? '',
      sliceAmount,
      fuzzyThreshold,
      sortOrder,
    );

    const items: AlfredListItem[] = filteredProcesses.map(({ name, pid, cmd, cpu, memory, battery }) => {
      const cpuInfo = cpu !== undefined ? `${cpu.toFixed(1)}%` : 'N/A';
      const memoryInfo = memory !== undefined ? `${memory.toFixed(1)}%` : 'N/A';

      // Conditionally include battery info in subtitle
      let subtitle: string;
      if (sortOrder === 'battery') {
        const batteryInfo = battery !== undefined ? battery.toFixed(2) : 'N/A';
        subtitle = `Battery: ${batteryInfo} | PID: ${pid} | CPU: ${cpuInfo} | Memory: ${memoryInfo} | CMD: ${cmd}`;
      } else {
        subtitle = `PID: ${pid} | CPU: ${cpuInfo} | Memory: ${memoryInfo} | CMD: ${cmd}`;
      }

      const payload: CallbackPayload = {
        pid,
        name,
        shouldForceKill,
        cmd,
      };

      return {
        title: name,
        subtitle,
        arg: JSON.stringify(payload, null, 2),
        uid: subtitle,
      };
    });

    if (batteryError) {
      items.unshift({
        title: '⚠️ Battery Data Unavailable',
        subtitle: batteryError,
        arg: '',
        uid: 'battery-error',
        valid: false, // Make item non-selectable
      });
    }

    const sliced = items.slice(0, sliceAmount);

    alfredClient.output({ items: sliced, rerun });
  } catch (error) {
    alfredClient.error(error);
  }
})();
