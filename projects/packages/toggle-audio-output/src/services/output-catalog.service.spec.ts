import { describe, expect, it } from 'vitest';
import type { AudioSource } from '../models/audio-source-all.model';
import type { PairedDevice } from '../models/bluetooth-device.model';
import { buildOutputEntries } from './output-catalog.service';

const speakers: AudioSource = {
  name: 'MacBook Pro Speakers',
  type: 'output',
  id: '81',
  uid: 'BuiltInSpeakerDevice',
};
const microphone: AudioSource = {
  name: 'MacBook Pro Microphone',
  type: 'input',
  id: '88',
  uid: 'BuiltInMicrophoneDevice',
};
const airpodsOutput: AudioSource = { name: 'AirPods Pro', type: 'output', id: '90', uid: '34-0e-22-bd-c2-bb:output' };
const tvOutput: AudioSource = { name: 'טלוויזיה', type: 'output', id: '95', uid: 'AirPlay-6F8BACA4FD36' };

const airpods: PairedDevice = {
  address: '34-0e-22-bd-c2-bb',
  name: 'AirPods Pro',
  connected: true,
  paired: true,
  isAudio: true,
};
const speaker: PairedDevice = {
  address: '2c-fd-b4-79-cb-40',
  name: 'Charge 5',
  connected: false,
  paired: true,
  isAudio: true,
};

describe('output-catalog.service', () => {
  describe('buildOutputEntries', () => {
    it('should list only outputs, flagging the current one', () => {
      const entries = buildOutputEntries({
        outputs: [speakers, microphone],
        currentName: 'MacBook Pro Speakers',
        bluetooth: [],
        airplay: [],
      });

      expect(entries).toEqual([
        { kind: 'core-audio', name: 'MacBook Pro Speakers', uid: 'BuiltInSpeakerDevice', current: true },
      ]);
    });

    it('should fold a connected Bluetooth device into its CoreAudio output by MAC', () => {
      const entries = buildOutputEntries({
        outputs: [airpodsOutput],
        bluetooth: [airpods, speaker],
        airplay: [],
      });

      expect(entries).toEqual([
        {
          kind: 'core-audio',
          name: 'AirPods Pro',
          uid: '34-0e-22-bd-c2-bb:output',
          current: false,
          bluetooth: airpods,
        },
        { ...speaker, kind: 'bluetooth' },
      ]);
    });

    it('should not repeat an AirPlay receiver that is already routed', () => {
      const entries = buildOutputEntries({
        outputs: [speakers, tvOutput],
        currentName: 'טלוויזיה',
        bluetooth: [],
        airplay: ['טלוויזיה', 'הסלון של קרן ויעקב'],
      });

      expect(entries.map(({ kind, name }) => `${kind}:${name}`)).toEqual([
        'core-audio:MacBook Pro Speakers',
        'core-audio:טלוויזיה',
        'airplay:הסלון של קרן ויעקב',
      ]);
    });
  });
});
