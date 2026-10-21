import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNetworks } from './network-loader.service';
import { getSavedNetworks, getWifiDevice, isWifiPowered } from './wifi.service';

vi.mock('./wifi.service', () => ({ getWifiDevice: vi.fn(), isWifiPowered: vi.fn(), getSavedNetworks: vi.fn() }));

describe('network-loader.service', () => {
  beforeEach(() => {
    vi.mocked(getWifiDevice).mockResolvedValue('en0');
    vi.mocked(isWifiPowered).mockResolvedValue(true);
    vi.mocked(getSavedNetworks).mockResolvedValue(['Aviv', 'LayerX Security']);
  });

  describe('loadNetworks', () => {
    it('should list every saved network and report nothing', async () => {
      expect(await loadNetworks()).toEqual({
        networks: ['Aviv', 'LayerX Security'],
        issues: [],
      });
    });

    it('should report a Mac without Wi-Fi', async () => {
      vi.mocked(getWifiDevice).mockResolvedValue(undefined);

      expect(await loadNetworks()).toEqual({ networks: [], issues: [{ kind: 'no-wifi-interface' }] });
      expect(isWifiPowered).not.toHaveBeenCalled();
    });

    it('should offer to power the radio on instead of listing networks it cannot join', async () => {
      vi.mocked(isWifiPowered).mockResolvedValue(false);

      expect(await loadNetworks()).toEqual({ networks: [], issues: [{ kind: 'wifi-off', device: 'en0' }] });
    });

    it('should report when nothing is saved yet', async () => {
      vi.mocked(getSavedNetworks).mockResolvedValue([]);

      expect(await loadNetworks()).toEqual({ networks: [], issues: [{ kind: 'no-saved-networks' }] });
    });

    it('should turn a networksetup failure into an issue instead of throwing', async () => {
      vi.mocked(getSavedNetworks).mockRejectedValue(new Error('en0 is not a Wi-Fi interface.'));

      expect(await loadNetworks()).toEqual({
        networks: [],
        issues: [{ kind: 'networksetup-failed', message: 'en0 is not a Wi-Fi interface.' }],
      });
    });
  });
});
