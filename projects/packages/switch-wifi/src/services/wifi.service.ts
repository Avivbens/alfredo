import { $, type TSpawnResult } from 'zurk';
import type { PowerState } from '../models/power-state.schema';

const WIFI_PORT = /^Hardware Port: (?:wi-?fi|airport)$/im;
const DEVICE_LINE = /^Device: (\S+)$/m;

/** networksetup prints the reason for a failure on stdout, leaving only a generic `** Error` line on stderr. */
function assertOk({ status, stdout, stderr }: TSpawnResult): void {
  if (status === 0) {
    return;
  }

  throw new Error(stdout.trim() || stderr.trim() || `networksetup exited with code ${status}`);
}

/** The Wi-Fi device is `en0` on most Macs but not all, so it is looked up rather than assumed. */
export async function getWifiDevice(): Promise<string | undefined> {
  const result = await $({ nothrow: true })`networksetup -listallhardwareports`;
  assertOk(result);

  const port = result.stdout.split(/\n\s*\n/).find((block) => WIFI_PORT.test(block));

  return port?.match(DEVICE_LINE)?.[1];
}

export async function isWifiPowered(device: string): Promise<boolean> {
  const result = await $({ nothrow: true })`networksetup -getairportpower ${device}`;
  assertOk(result);

  return result.stdout.trim().endsWith(': On');
}

export async function setWifiPower(device: string, state: PowerState): Promise<void> {
  assertOk(await $({ nothrow: true })`networksetup -setairportpower ${device} ${state}`);
}

/** Each network sits on its own tab-indented line, and only that tab is stripped - an SSID may start or end with spaces. */
export async function getSavedNetworks(device: string): Promise<string[]> {
  const result = await $({ nothrow: true })`networksetup -listpreferredwirelessnetworks ${device}`;
  assertOk(result);

  return result.stdout
    .split('\n')
    .filter((line) => line.startsWith('\t'))
    .map((line) => line.slice(1));
}
