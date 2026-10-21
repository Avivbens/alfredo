import type { AlfredListItem } from 'fast-alfred';
import { encodeAction } from '../models/network-action.schema';

/** The uid lets Alfred learn which networks get picked and float them above macOS's saved order. */
export function toNetworkItem(ssid: string): AlfredListItem {
  return {
    uid: ssid,
    title: ssid,
    subtitle: 'Saved network · ↩ to join',
    arg: encodeAction({ kind: 'join', ssid }),
  };
}
