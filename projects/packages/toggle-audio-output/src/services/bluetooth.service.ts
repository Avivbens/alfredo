import { $, type TSpawnResult } from 'zurk';
import { normalizeAddress } from '../common/address.util';
import {
  AUDIO_MINOR_TYPE_PATTERN,
  BLUETOOTH_PRIVACY_SETTINGS_URL,
  DISCONNECT_TIMEOUT_SECONDS,
} from '../config/constants';
import {
  BluetoothDeviceListSchema,
  BluetoothProfilerSchema,
  type PairedDevice,
} from '../models/bluetooth-device.model';
import { BluetoothError, BluetoothFailure } from '../models/bluetooth-failure.model';

const TIMEOUT_EXIT_CODE = 75;

/**
 * blueutil reports setup problems only through its exit code (see the table in
 * its `--help`)
 *
 * Exit codes:
 *    0 Success
 *    1 General failure
 *   64 Wrong usage like missing or unexpected arguments, wrong parameters
 *   69 Bluetooth or interface not available
 *   70 Internal error
 *   71 System error like shortage of memory
 *   75 Timeout error
 *  134 Abort signal may indicate absence of access to Bluetooth API
 */
function assertOk({ status, signal, stderr }: TSpawnResult): void {
  if (status === 0) {
    return;
  }

  if (status === 127) {
    throw new BluetoothError(BluetoothFailure.NOT_INSTALLED, 'blueutil is not installed');
  }

  if (status === 134 || signal === 'SIGABRT') {
    throw new BluetoothError(BluetoothFailure.NO_ACCESS, 'blueutil is not allowed to access Bluetooth');
  }

  if (status === 69) {
    throw new BluetoothError(BluetoothFailure.UNAVAILABLE, 'No Bluetooth interface is available');
  }

  throw new BluetoothError(BluetoothFailure.UNKNOWN, stderr.trim() || `blueutil exited with code ${status}`);
}

export async function isBluetoothPowered(): Promise<boolean> {
  const result = await $({ nothrow: true })`blueutil --power`;
  assertOk(result);

  return result.stdout.trim() === '1';
}

export async function powerOnBluetooth(): Promise<void> {
  assertOk(await $({ nothrow: true })`blueutil --power 1`);
}

type ProfilerDetails = Pick<PairedDevice, 'name' | 'isAudio'>;

/**
 * IOBluetooth reports the name a device advertises over the link, which for
 * AirPods is the bare model name.
 *
 * System Settings instead shows the iCloud display name, and that is what users put in the workflow config
 *
 * The same report carries the device's minor type, the only hint of whether it plays audio at all.
 *
 * @returns map - key is the normalized MAC address.
 */
async function getProfilerDetailsByMacAddress(): Promise<Map<string, ProfilerDetails>> {
  const result = await $({ nothrow: true })`system_profiler SPBluetoothDataType -json`;
  if (result.status !== 0) {
    return new Map();
  }

  try {
    const [controller] = BluetoothProfilerSchema.parse(JSON.parse(result.stdout)).SPBluetoothDataType;
    const records = [...(controller?.device_connected ?? []), ...(controller?.device_not_connected ?? [])];

    return new Map(
      records
        .flatMap((record) => Object.entries(record))
        .map(([name, { device_address, device_minorType }]) => [
          normalizeAddress(device_address),
          { name, isAudio: AUDIO_MINOR_TYPE_PATTERN.test(device_minorType ?? '') },
        ]),
    );
  } catch {
    return new Map();
  }
}

export async function getPairedDevices(): Promise<PairedDevice[]> {
  const listing = $({ nothrow: true })`blueutil --paired --format json`;
  const [result, details] = await Promise.all([listing, getProfilerDetailsByMacAddress()]);
  assertOk(result);

  const devices = BluetoothDeviceListSchema.parse(JSON.parse(result.stdout));

  return devices.map((device) => {
    const detail = details.get(normalizeAddress(device.address));

    return { ...device, name: detail?.name ?? device.name, isAudio: detail?.isAudio ?? false };
  });
}

export async function disconnectDevice(address: string): Promise<void> {
  assertOk(await $({ nothrow: true })`blueutil --disconnect ${address}`);
}

/**
 * Devices are addressed by MAC throughout, since a name is ambiguous between
 * paired and recent devices. The drop runs even when macOS already reports the
 * device as connected - a wedged audio route only recovers from a full drop -
 * and a device that never acknowledges it must not block the reconnect.
 */
export async function forceReconnect(address: string): Promise<void> {
  await disconnectDevice(address);

  const dropped = await $({ nothrow: true })`blueutil --wait-disconnect ${address} ${DISCONNECT_TIMEOUT_SECONDS}`;
  if (dropped.status !== TIMEOUT_EXIT_CODE) {
    assertOk(dropped);
  }

  assertOk(await $({ nothrow: true })`blueutil --connect ${address}`);
}

export async function openBluetoothPrivacySettings(): Promise<void> {
  await $`open ${BLUETOOTH_PRIVACY_SETTINGS_URL}`;
}
