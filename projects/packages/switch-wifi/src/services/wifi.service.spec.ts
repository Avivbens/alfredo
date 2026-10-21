import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSavedNetworks, getWifiDevice, isWifiPowered, setWifiPower } from './wifi.service';

const { zurkTemplateLiteralFn } = vi.hoisted(() => ({ zurkTemplateLiteralFn: vi.fn() }));
vi.mock('zurk', () => ({ $: vi.fn(() => zurkTemplateLiteralFn) }));

/** Trimmed from `networksetup -listallhardwareports` on a MacBook with Thunderbolt adapters. */
const HARDWARE_PORTS = `
Hardware Port: Ethernet Adapter (en3)
Device: en3
Ethernet Address: 7a:cb:81:df:eb:ab

Hardware Port: Thunderbolt Bridge
Device: bridge0
Ethernet Address: 36:15:ac:5f:aa:80

Hardware Port: Wi-Fi
Device: en0
Ethernet Address: c0:c7:db:08:a4:e2

Hardware Port: Thunderbolt 1
Device: en1
Ethernet Address: 36:15:ac:5f:aa:80

VLAN Configurations
===================
`;

const NOT_WIFI_STDOUT = 'en9 is not a Wi-Fi interface.\n';
const NOT_WIFI_STDERR = '** Error: Error obtaining wireless information.\n';

function exited(stdout: string, status = 0, stderr = '') {
  return { status, stdout, stderr };
}

describe('wifi.service', () => {
  beforeEach(() => {
    zurkTemplateLiteralFn.mockReset();
  });

  describe('getWifiDevice', () => {
    it('should find the device behind the Wi-Fi hardware port', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited(HARDWARE_PORTS));

      expect(await getWifiDevice()).toBe('en0');
    });

    it('should find the port on older systems that still call it AirPort', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited('Hardware Port: AirPort\nDevice: en1\nEthernet Address: 00:00\n'));

      expect(await getWifiDevice()).toBe('en1');
    });

    it('should resolve to undefined on a Mac without Wi-Fi', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(
        exited('Hardware Port: Ethernet\nDevice: en0\nEthernet Address: 7a:cb:81:df:eb:ab\n'),
      );

      expect(await getWifiDevice()).toBeUndefined();
    });
  });

  describe('isWifiPowered', () => {
    it('should report a powered radio', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited('Wi-Fi Power (en0): On\n'));

      expect(await isWifiPowered('en0')).toBe(true);
    });

    it('should report a radio that is off', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited('Wi-Fi Power (en0): Off\n'));

      expect(await isWifiPowered('en0')).toBe(false);
    });

    it("should reject with networksetup's own message when the device is not Wi-Fi", async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited(NOT_WIFI_STDOUT, 10, NOT_WIFI_STDERR));

      await expect(isWifiPowered('en9')).rejects.toThrow('en9 is not a Wi-Fi interface.');
    });
  });

  describe('setWifiPower', () => {
    it.each(['on', 'off'] as const)('should turn the radio of the given device %s', async (state) => {
      zurkTemplateLiteralFn.mockResolvedValue(exited(''));

      await setWifiPower('en0', state);

      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(expect.anything(), 'en0', state);
    });

    it('should reject when networksetup fails', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited(NOT_WIFI_STDOUT, 10, NOT_WIFI_STDERR));

      await expect(setWifiPower('en9', 'off')).rejects.toThrow('en9 is not a Wi-Fi interface.');
    });
  });

  describe('getSavedNetworks', () => {
    it('should list saved networks in the order macOS prefers them', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(
        exited('Preferred networks on en0:\n\tAviv\n\tKeren&yaakov\n\tHanSo Café customers\n'),
      );

      expect(await getSavedNetworks('en0')).toEqual(['Aviv', 'Keren&yaakov', 'HanSo Café customers']);
    });

    it('should keep spaces that belong to the network name', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited('Preferred networks on en0:\n\t Lobby \n\tBS - 6G\n'));

      expect(await getSavedNetworks('en0')).toEqual([' Lobby ', 'BS - 6G']);
    });

    it('should resolve to an empty list when nothing is saved', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited('Preferred networks on en0:\n'));

      expect(await getSavedNetworks('en0')).toEqual([]);
    });

    it('should reject when networksetup fails', async () => {
      zurkTemplateLiteralFn.mockResolvedValue(exited(NOT_WIFI_STDOUT, 10, NOT_WIFI_STDERR));

      await expect(getSavedNetworks('en9')).rejects.toThrow('en9 is not a Wi-Fi interface.');
    });
  });
});
