import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioSource } from '../models/audio-source-all.model';
import type { PairedDevice } from '../models/bluetooth-device.model';
import { BluetoothError, BluetoothFailure } from '../models/bluetooth-failure.model';
import { discoverAirPlayReceivers } from './airplay.service';
import { getConnectedAudioDevices, getCurrentAudioOutput } from './audio-connection.service';
import { getPairedDevices, isBluetoothPowered } from './bluetooth.service';
import { loadOutputs } from './output-loader.service';

vi.mock('./airplay.service', () => ({ discoverAirPlayReceivers: vi.fn() }));
vi.mock('./audio-connection.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./audio-connection.service')>()),
  getConnectedAudioDevices: vi.fn(),
  getCurrentAudioOutput: vi.fn(),
}));
vi.mock('./bluetooth.service', () => ({ getPairedDevices: vi.fn(), isBluetoothPowered: vi.fn() }));

const speakers: AudioSource = { name: 'MacBook Pro Speakers', type: 'output', id: '81', uid: 'BuiltInSpeakerDevice' };
const speaker: PairedDevice = {
  address: '2c-fd-b4-79-cb-40',
  name: 'Charge 5',
  connected: false,
  paired: true,
  isAudio: true,
};

describe('output-loader.service', () => {
  beforeEach(() => {
    vi.mocked(getConnectedAudioDevices).mockResolvedValue([speakers]);
    vi.mocked(getCurrentAudioOutput).mockResolvedValue('MacBook Pro Speakers');
    vi.mocked(isBluetoothPowered).mockResolvedValue(true);
    vi.mocked(getPairedDevices).mockResolvedValue([speaker]);
    vi.mocked(discoverAirPlayReceivers).mockResolvedValue(['Living Room']);
  });

  describe('loadOutputs', () => {
    it('should list every source and report nothing when all of them work', async () => {
      const { entries, issues } = await loadOutputs();

      expect(entries.map(({ kind, name }) => `${kind}:${name}`)).toEqual([
        'core-audio:MacBook Pro Speakers',
        'airplay:Living Room',
        'bluetooth:Charge 5',
      ]);
      expect(issues).toEqual([]);
    });

    it('should keep the other sources when SwitchAudioSource fails', async () => {
      vi.mocked(getConnectedAudioDevices).mockRejectedValue(new Error('SwitchAudioSource: command not found'));

      const { entries, issues } = await loadOutputs();

      expect(entries.map(({ name }) => name)).toEqual(['Living Room', 'Charge 5']);
      expect(issues).toEqual([{ kind: 'switchaudio-failed', message: 'SwitchAudioSource: command not found' }]);
    });

    it('should hide paired devices and report it when Bluetooth is off', async () => {
      vi.mocked(isBluetoothPowered).mockResolvedValue(false);

      const { entries, issues } = await loadOutputs();

      expect(entries.some(({ kind }) => kind === 'bluetooth')).toBe(false);
      expect(issues).toEqual([{ kind: 'bluetooth-off' }]);
    });

    it('should pass a blueutil failure through as is', async () => {
      const error = new BluetoothError(BluetoothFailure.NOT_INSTALLED, 'blueutil is not installed');
      vi.mocked(isBluetoothPowered).mockRejectedValue(error);
      vi.mocked(getPairedDevices).mockRejectedValue(error);

      const { issues } = await loadOutputs();

      expect(issues).toEqual([{ kind: 'bluetooth-error', error }]);
    });

    it('should wrap any other Bluetooth failure as unknown', async () => {
      vi.mocked(getPairedDevices).mockRejectedValue(new Error('unexpected JSON'));

      const { issues } = await loadOutputs();

      expect(issues).toEqual([
        {
          kind: 'bluetooth-error',
          error: expect.objectContaining({ failure: BluetoothFailure.UNKNOWN, message: 'unexpected JSON' }),
        },
      ]);
    });

    it('should report an empty paired list, which may also mean missing Bluetooth access', async () => {
      vi.mocked(getPairedDevices).mockResolvedValue([]);

      const { issues } = await loadOutputs();

      expect(issues).toEqual([{ kind: 'no-paired-devices' }]);
    });
  });
});
