import { describe, expect, it } from 'vitest';
import type { OutputEntry } from '../models/output-entry.schema';
import { orderByPreference } from './device-order.service';

const speakers: OutputEntry = {
  kind: 'core-audio',
  name: 'MacBook Pro Speakers',
  uid: 'BuiltInSpeakerDevice',
  current: false,
};
const headphones: OutputEntry = {
  kind: 'core-audio',
  name: 'Aviv’s AirPods Max',
  uid: 'f8-73-df:output',
  current: true,
};
const receiver: OutputEntry = { kind: 'airplay', name: 'Living Room' };
const speaker: OutputEntry = {
  kind: 'bluetooth',
  address: '2c-fd-b4-79-cb-40',
  name: 'Charge 5',
  connected: false,
  paired: true,
  isAudio: true,
};
const watch: OutputEntry = {
  kind: 'bluetooth',
  address: '60-dd-70-03-53-fd',
  name: 'Apple Watch',
  connected: true,
  paired: true,
  isAudio: false,
};

const namesOf = (entries: OutputEntry[]) => entries.map(({ name }) => name);

describe('device-order.service', () => {
  describe('orderByPreference', () => {
    it('should put the current output first and non-audio devices last', () => {
      expect(namesOf(orderByPreference([watch, speaker, receiver, speakers, headphones], []))).toEqual([
        'Aviv’s AirPods Max',
        'MacBook Pro Speakers',
        'Living Room',
        'Charge 5',
        'Apple Watch',
      ]);
    });

    it('should follow the preferred list over everything else', () => {
      expect(namesOf(orderByPreference([headphones, speaker, watch], ['Apple Watch', 'Charge 5']))).toEqual([
        'Apple Watch',
        'Charge 5',
        'Aviv’s AirPods Max',
      ]);
    });

    it('should match preferred names ignoring case and the curly apostrophes macOS writes', () => {
      expect(namesOf(orderByPreference([speakers, { ...headphones, current: false }], ["aviv's airpods max"]))).toEqual(
        ['Aviv’s AirPods Max', 'MacBook Pro Speakers'],
      );
    });
  });
});
