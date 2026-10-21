import { beforeEach, describe, expect, it, vi } from 'vitest';
import { joinNetwork } from './control-center.service';

const { zurkTemplateLiteralFn } = vi.hoisted(() => ({ zurkTemplateLiteralFn: vi.fn() }));
vi.mock('zurk', () => ({ $: vi.fn(() => zurkTemplateLiteralFn) }));
vi.mock('node:timers/promises', () => ({ setTimeout: vi.fn() }));

describe('control-center.service', () => {
  beforeEach(() => {
    zurkTemplateLiteralFn.mockReset();
  });

  describe('joinNetwork', () => {
    it('should hand the SSID to the script as an argument rather than splicing it in', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ status: 0, stdout: 'joining\n', stderr: '' });

      expect(await joinNetwork('Ram’s iPhone')).toBe('joining');
      expect(zurkTemplateLiteralFn).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('wifi-network-'),
        'Ram’s iPhone',
      );
    });

    it('should report a network that is already connected instead of pressing it again', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({ status: 0, stdout: 'already-connected\n', stderr: '' });

      expect(await joinNetwork('Aviv')).toBe('already-connected');
    });

    it('should retry the flaky Control Center `Invalid index` error', async () => {
      zurkTemplateLiteralFn
        .mockResolvedValueOnce({ status: 1, stdout: '', stderr: 'execution error: Invalid index. (-1719)' })
        .mockResolvedValueOnce({ status: 0, stdout: 'joining\n', stderr: '' });

      expect(await joinNetwork('LayerX Security')).toBe('joining');
      expect(zurkTemplateLiteralFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry a network that is out of range', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({
        status: 1,
        stdout: '',
        stderr: '1520:1702: execution error: PlayRenfe is not in range (-2700)\n',
      });

      await expect(joinNetwork('PlayRenfe')).rejects.toThrow(/^PlayRenfe is not in range$/);
      expect(zurkTemplateLiteralFn).toHaveBeenCalledTimes(1);
    });

    it('should point at the Accessibility setting when Alfred lacks access', async () => {
      zurkTemplateLiteralFn.mockResolvedValue({
        status: 1,
        stdout: '',
        stderr: 'osascript is not allowed assistive access. (-25211)',
      });

      await expect(joinNetwork('LayerX Security')).rejects.toThrow('Alfred needs Accessibility access');
      expect(zurkTemplateLiteralFn).toHaveBeenCalledTimes(1);
    });
  });
});
