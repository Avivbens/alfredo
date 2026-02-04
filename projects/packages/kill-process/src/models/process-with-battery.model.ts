import type { ProcessDescriptor } from 'ps-list';

/**
 * Extended process descriptor that includes battery/energy impact data from powermetrics
 */
export interface ProcessWithBattery extends ProcessDescriptor {
  /**
   * Energy impact value from powermetrics command
   * Undefined if battery data is not available or not fetched
   */
  battery?: number;
}
