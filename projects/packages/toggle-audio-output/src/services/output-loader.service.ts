import type { PairedDevice } from '../models/bluetooth-device.model';
import { BluetoothError, BluetoothFailure } from '../models/bluetooth-failure.model';
import type { OutputEntry } from '../models/output-entry.schema';
import type { OutputIssue } from '../models/output-issue.schema';
import { discoverAirPlayReceivers } from './airplay.service';
import { getConnectedAudioDevices, getCurrentAudioOutput } from './audio-connection.service';
import { getPairedDevices, isBluetoothPowered } from './bluetooth.service';
import { buildOutputEntries } from './output-catalog.service';

interface LoadedOutputs {
  entries: OutputEntry[];
  issues: OutputIssue[];
}

function valueOf<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * blueutil exits 0 with an empty list when it cannot reach the Bluetooth API at
 * all, which is indistinguishable from a Mac that has genuinely never paired
 * anything - so an empty list is still reported, and its row offers the permission fix.
 */
function toBluetoothIssue(
  powered: PromiseSettledResult<boolean>,
  paired: PromiseSettledResult<PairedDevice[]>,
): OutputIssue | undefined {
  for (const result of [powered, paired]) {
    if (result.status === 'rejected') {
      const { reason } = result;
      const error =
        reason instanceof BluetoothError ? reason : new BluetoothError(BluetoothFailure.UNKNOWN, messageOf(reason));

      return { kind: 'bluetooth-error', error };
    }
  }

  if (!valueOf(powered, false)) {
    return { kind: 'bluetooth-off' };
  }

  if (!valueOf(paired, []).length) {
    return { kind: 'no-paired-devices' };
  }

  return undefined;
}

/** Every source settles on its own, so one failing tool never hides the outputs the others found. */
export async function loadOutputs(): Promise<LoadedOutputs> {
  const [outputs, current, powered, paired, receivers] = await Promise.allSettled([
    getConnectedAudioDevices(),
    getCurrentAudioOutput(),
    isBluetoothPowered(),
    getPairedDevices(),
    discoverAirPlayReceivers(),
  ]);

  const entries = buildOutputEntries({
    outputs: valueOf(outputs, []),
    currentName: valueOf(current, undefined),
    bluetooth: valueOf(powered, false) ? valueOf(paired, []) : [],
    airplay: valueOf(receivers, []),
  });

  const issues = [
    outputs.status === 'rejected'
      ? ({ kind: 'switchaudio-failed', message: messageOf(outputs.reason) } satisfies OutputIssue)
      : undefined,
    toBluetoothIssue(powered, paired),
  ].filter((issue): issue is OutputIssue => !!issue);

  return { entries, issues };
}
