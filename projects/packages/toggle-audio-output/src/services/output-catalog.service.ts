import type { AudioSource } from '../models/audio-source-all.model';
import type { PairedDevice } from '../models/bluetooth-device.model';
import type { CoreAudioEntry, OutputEntry } from '../models/output-entry.schema';
import { isOutputFor } from './audio-connection.service';

interface OutputSources {
  outputs: AudioSource[];
  currentName?: string;
  bluetooth: PairedDevice[];
  airplay: string[];
}

/** A device CoreAudio already exposes is listed once, as an output that switches instantly. */
export function buildOutputEntries({ outputs, currentName, bluetooth, airplay }: OutputSources): OutputEntry[] {
  const coreAudio = outputs
    .filter(({ type }) => type === 'output')
    .map((output): CoreAudioEntry => ({
      kind: 'core-audio',
      name: output.name,
      uid: output.uid,
      current: output.name === currentName,
      bluetooth: bluetooth.find(({ address }) => isOutputFor(address, output)),
    }));

  const outputNames = new Set(coreAudio.map(({ name }) => name));
  const routedAddresses = new Set(coreAudio.flatMap(({ bluetooth }) => (bluetooth ? [bluetooth.address] : [])));

  return [
    ...coreAudio,
    ...airplay.filter((name) => !outputNames.has(name)).map((name): OutputEntry => ({ kind: 'airplay', name })),
    ...bluetooth
      .filter(({ address }) => !routedAddresses.has(address))
      .map((device): OutputEntry => ({ ...device, kind: 'bluetooth' })),
  ];
}
