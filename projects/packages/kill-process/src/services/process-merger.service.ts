import type { ProcessDescriptor } from 'ps-list';
import type { ProcessWithBattery } from '../models/process-with-battery.model';

/**
 * Merges battery data into process list
 *
 * @param processes - Process list from ps-list
 * @param batteryData - Map of PID to energy impact value
 * @returns Processes with battery data merged in
 */
export function mergeProcessesWithBattery(
  processes: ProcessDescriptor[],
  batteryData: Map<number, number>,
): ProcessWithBattery[] {
  return processes.map((process) => {
    const battery = batteryData.get(process.pid);

    return {
      ...process,
      battery: battery !== undefined ? battery : undefined,
    };
  });
}
