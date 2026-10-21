import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverAirPlayReceivers, streamToAirPlay } from './airplay.service';

const { zurkTemplateLiteralFn } = vi.hoisted(() => ({ zurkTemplateLiteralFn: vi.fn() }));
vi.mock('zurk', () => ({ $: vi.fn(() => zurkTemplateLiteralFn) }));
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

/** Trimmed from `dns-sd -Z _airplay._tcp local.` - this Mac shows up twice, once per interface. */
const BROWSE_OUTPUT = `
Browsing for _airplay._tcp.local.
_airplay._tcp                                   PTR     Tomb\\032Raider._airplay._tcp
Tomb\\032Raider._airplay._tcp                    SRV     0 0 7000 StudioX50-6084DAFB.local. ; Replace with unicast FQDN of target host
Tomb\\032Raider._airplay._tcp                    TXT     "deviceid=3E:7D:AD:12:FB:6A" "model=AppleTV3,2" "osvers=8.4.3"
tlv-mp6o1._airplay._tcp                         TXT     "act=2" "deviceid=FA:02:CA:00:B3:2C" "model=Mac17,8" "srcvers=960.13.25"
pacman\\032left._airplay._tcp                    TXT     "acl=0" "model=FW-55BZ40H" "manufacturer=Sony"
tlv-mpibc._airplay._tcp                         TXT     "act=2" "model=Mac17,8"
tlv-mpibc._airplay._tcp                         TXT     "act=2" "model=Mac17,8"
טלוויזיה._airplay._tcp                          TXT     "acl=0" "model=65C61K" "integrator=TCL"
`;

describe('airplay.service', () => {
  beforeEach(() => {
    zurkTemplateLiteralFn.mockReset();
  });

  describe('discoverAirPlayReceivers', () => {
    it('should list every receiver once, decoding DNS escapes and dropping Macs, which the Sound menu never offers', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ stdout: BROWSE_OUTPUT });

      expect(await discoverAirPlayReceivers()).toEqual(['Tomb Raider', 'pacman left', 'טלוויזיה']);
    });

    it('should decode names whose UTF-8 bytes were escaped one by one', async () => {
      const escaped = Array.from(Buffer.from('הסלון', 'utf8'), (byte) => `\\${String(byte).padStart(3, '0')}`).join('');
      zurkTemplateLiteralFn.mockResolvedValue({ stdout: `${escaped}\\032TV._airplay._tcp  TXT  "model=AppleTV11,1"` });

      expect(await discoverAirPlayReceivers()).toEqual(['הסלון TV']);
    });

    it('should keep a receiver whose record carries no model', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ stdout: 'Kitchen._airplay._tcp  TXT  "deviceid=AA:BB"' });

      expect(await discoverAirPlayReceivers()).toEqual(['Kitchen']);
    });
  });

  describe('streamToAirPlay', () => {
    it('should retry the flaky Control Center `Invalid index` error rather than report it as missing access', async () => {
      zurkTemplateLiteralFn
        .mockResolvedValueOnce({ status: 1, stderr: 'execution error: Invalid index. (-1719)' })
        .mockResolvedValueOnce({ status: 0, stderr: '' });

      await expect(streamToAirPlay('Living Room')).resolves.toBeUndefined();
      expect(zurkTemplateLiteralFn).toHaveBeenCalledTimes(2);
    });

    it('should point at the Accessibility setting when Alfred lacks access', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({
        status: 1,
        stderr: 'osascript is not allowed assistive access. (-25211)',
      });

      await expect(streamToAirPlay('Living Room')).rejects.toThrow('Alfred needs Accessibility access');
      expect(zurkTemplateLiteralFn).toHaveBeenCalledTimes(1);
    });
  });
});
