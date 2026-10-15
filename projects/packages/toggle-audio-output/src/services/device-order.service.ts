import type { BluetoothDevice } from '../models/bluetooth-device.model';

/** macOS writes curly apostrophes into device names, but people type straight ones. */
function toComparable(name: string): string {
  return name.trim().toLowerCase().replace(/[‘’]/g, "'");
}

/**
 * The preferred list is the user's own ordering, so it wins outright. Whatever
 * is left falls back to connected-first, keeping the device most likely to need
 * a reconnect near the top.
 */
export function orderByPreference(devices: BluetoothDevice[], preferredNames: string[]): BluetoothDevice[] {
  const rank = new Map(preferredNames.map((name, index) => [toComparable(name), index]));
  const rankOf = ({ name }: BluetoothDevice): number => rank.get(toComparable(name)) ?? Infinity;

  return [...devices].sort((a, b) => {
    const [aRank, bRank] = [rankOf(a), rankOf(b)];

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return Number(b.connected) - Number(a.connected) || a.name.localeCompare(b.name);
  });
}
