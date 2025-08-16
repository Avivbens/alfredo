import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import psList from 'ps-list';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { CallbackPayload } from '../models/callback-payload.model';
import { SortByResource, getSortByResource } from '../models/sort-by-resources.model';
import { searchProcess } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('kill-process'));

  const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });

  const fuzzyThreshold: number = alfredClient.env.getEnv(Variables.FUZZY_THRESHOLD, {
    defaultValue: 0.4,
    parser: (input) => Number(input) / 10,
  });

  const sortByResource: SortByResource = alfredClient.env.getEnv(Variables.SORT_BY_RESOURCE, {
    defaultValue: 'none',
    parser: getSortByResource,
  });

  const rerunInterval: number = alfredClient.env.getEnv(Variables.RERUN_INTERVAL, {
    defaultValue: 1,
    parser: (input) => Math.round(Number(input)),
  });

  try {
    const processes = await psList();

    const filteredProcesses = await searchProcess(
      processes,
      alfredClient.input,
      sliceAmount,
      fuzzyThreshold,
      sortByResource,
    );

    const items: AlfredListItem[] = filteredProcesses.map(({ name, pid, cmd, cpu, memory }) => {
      const cpuInfo = cpu !== undefined ? `${cpu.toFixed(1)}%` : 'N/A';
      const memoryInfo = memory !== undefined ? `${memory.toFixed(1)}%` : 'N/A';
      const subtitle = `PID: ${pid} | CPU: ${cpuInfo} | Memory: ${memoryInfo} | CMD: ${cmd}`;

      return {
        title: name,
        subtitle,
        arg: String(pid) satisfies CallbackPayload,
        uid: subtitle,
      };
    });

    const sliced = items.slice(0, sliceAmount);

    alfredClient.output({ items: sliced, rerun: rerunInterval });
  } catch (error) {
    alfredClient.error(error);
  }
})();
