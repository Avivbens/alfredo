import type { AlfredListItem } from 'fast-alfred';
import { encodeAction } from '../models/output-action.schema';
import type { AirPlayEntry, BluetoothEntry, CoreAudioEntry, OutputEntry } from '../models/output-entry.schema';

function toCoreAudioItem({ name, uid, current, bluetooth }: CoreAudioEntry): AlfredListItem {
  const state = current ? 'Current output' : '↩ to switch audio here';

  if (!bluetooth) {
    return { title: name, subtitle: state, arg: encodeAction({ kind: 'switch', uid, name }), match: name };
  }

  const { address } = bluetooth;

  return {
    title: name,
    subtitle: `Bluetooth · ${state} · ⌥ to force a reconnect · ⌘ to disconnect`,
    arg: encodeAction({ kind: 'switch', uid, name }),
    match: `${name} ${address}`,
    mods: {
      alt: { arg: encodeAction({ kind: 'reconnect', address, name }), subtitle: `Force a reconnect to ${name}` },
      cmd: { arg: encodeAction({ kind: 'disconnect', address, name }), subtitle: `Disconnect ${name}` },
    },
  };
}

function toAirPlayItem({ name }: AirPlayEntry): AlfredListItem {
  return {
    title: name,
    subtitle: 'AirPlay · ↩ to stream audio here',
    arg: encodeAction({ kind: 'airplay', name }),
    match: name,
  };
}

function toBluetoothItem({ address, name, connected, isAudio }: BluetoothEntry): AlfredListItem {
  const primary = connected ? '↩ to force a reconnect' : `↩ to connect${isAudio ? ' and route audio here' : ''}`;

  return {
    title: name,
    subtitle: `Bluetooth · ${connected ? 'Connected' : 'Paired'} · ${address} · ${primary}${connected ? ' · ⌘ to disconnect' : ''}`,
    arg: encodeAction({ kind: 'reconnect', address, name }),
    match: `${name} ${address}`,
    mods: {
      cmd: connected
        ? { arg: encodeAction({ kind: 'disconnect', address, name }), subtitle: `Disconnect ${name}` }
        : { arg: '', subtitle: `${name} is not connected`, valid: false },
    },
  };
}

export function toOutputItem(entry: OutputEntry): AlfredListItem {
  switch (entry.kind) {
    case 'core-audio':
      return toCoreAudioItem(entry);

    case 'airplay':
      return toAirPlayItem(entry);

    case 'bluetooth':
      return toBluetoothItem(entry);
  }
}

export function searchTextOf(entry: OutputEntry): string {
  switch (entry.kind) {
    case 'core-audio':
      return entry.bluetooth ? `${entry.name} ${entry.bluetooth.address}` : entry.name;

    case 'airplay':
      return entry.name;

    case 'bluetooth':
      return `${entry.name} ${entry.address}`;
  }
}
