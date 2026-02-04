import { $ } from 'zurk';
import { BatteryFetchResult, BatteryFetchResultSchema } from '../models/battery-fetch-result.model';
import { ensurePasswordlessSudo } from './sudo-setup.service';

/**
 * Fetches battery/energy impact data for all running processes
 * Uses sudo powermetrics and parses the first sample only
 *
 * @returns Result object with success status, data map, and optional error message
 */
export async function fetchBatteryData(): Promise<BatteryFetchResult> {
  try {
    const sudoCheck = await ensurePasswordlessSudo();
    if (!sudoCheck.success) {
      return BatteryFetchResultSchema.parse({
        success: false,
        data: new Map(),
        error: sudoCheck.error || 'Failed to configure passwordless sudo for powermetrics',
      });
    }

    // Execute powermetrics with sudo
    // --samplers tasks: Only collect task/process data
    // --show-process-energy: Include energy impact column
    // -n 1: Take only 1 sample
    // -i 2500: Sample interval 2.5 seconds (provides accurate energy measurements)
    const { stdout, stderr } = await $({
      timeout: 6000, // 6 second timeout (allows for 2.5s sampling + buffer)
      nothrow: true,
    })`sudo powermetrics --samplers tasks --show-process-energy -n 1 -i 2500`;

    if (stderr && !stdout) {
      return BatteryFetchResultSchema.parse({
        success: false,
        data: new Map(),
        error: `Powermetrics error: ${stderr}`,
      });
    }

    // Parse the output
    const batteryMap = parsePowermetricsOutput(stdout);

    const result = {
      success: true,
      data: batteryMap,
    };

    return BatteryFetchResultSchema.parse(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return BatteryFetchResultSchema.parse({
      success: false,
      data: new Map(),
      error: `Failed to fetch battery data: ${errorMessage}`,
    });
  }
}

/**
 * Parses powermetrics output to extract PID and Energy Impact
 *
 * Expected format:
 * *** Running tasks ***
 *
 * Name                               ID     CPU ms/s  User%  Deadlines (<2 ms, 2-5 ms)  Wakeups (Intr, Pkg idle)  Energy Impact
 * Google Chrome Helper (Renderer)    73924  56.45     97.12  0.40    0.20               6.58    0.00              267.69
 *
 * @param output - Raw stdout from powermetrics
 * @returns Map of PID to energy impact value
 */
function parsePowermetricsOutput(output: string): Map<number, number> {
  const batteryMap = new Map<number, number>();

  if (!output) {
    return batteryMap;
  }

  const lines = output.split('\n');
  let inTasksSection = false;
  let headerPassed = false;

  for (const line of lines) {
    // Detect start of tasks section
    if (line.includes('*** Running tasks ***')) {
      inTasksSection = true;
      continue;
    }

    // Skip until we're in the tasks section
    if (!inTasksSection) {
      continue;
    }

    // Skip the header line
    if (line.includes('Energy Impact') && line.includes('Name')) {
      headerPassed = true;
      continue;
    }

    // Skip if we haven't passed the header yet
    if (!headerPassed) {
      continue;
    }

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Parse data line
    // Format: Name (spaces) PID (spaces) ... (spaces) EnergyImpact
    // We need to extract the last number (Energy Impact) and the ID column
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by whitespace and filter empty strings
    const parts = trimmed.split(/\s+/).filter(Boolean);

    // Need at least: Name, ID, and other columns ending with Energy Impact
    // Typically: [Name(s), ID, CPU, User%, Deadlines..., Wakeups..., EnergyImpact]
    if (parts.length < 3) {
      continue;
    }

    try {
      // The ID is typically the second column after name(s)
      // Try to find the first numeric value that could be a PID
      let pidIndex = -1;
      let pid = 0;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        const parsed = parseInt(part, 10);
        if (!isNaN(parsed) && parsed > 0) {
          pid = parsed;
          pidIndex = i;
          break;
        }
      }

      if (pidIndex === -1) {
        continue;
      }

      // Energy Impact is the last column
      const lastPart = parts[parts.length - 1];
      if (!lastPart) continue;
      const energyImpact = parseFloat(lastPart);

      if (!isNaN(energyImpact) && energyImpact >= 0) {
        batteryMap.set(pid, energyImpact);
      }
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  return batteryMap;
}
