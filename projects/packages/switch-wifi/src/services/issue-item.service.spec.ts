import type { FastAlfred } from 'fast-alfred';
import { describe, expect, it } from 'vitest';
import { NetworkActionSchema } from '../models/network-action.schema';
import { toIssueItem } from './issue-item.service';

const icons = { getIcon: (name: string) => `${name}.png` } as unknown as FastAlfred['icons'];

describe('issue-item.service', () => {
  describe('toIssueItem', () => {
    it('should turn the radio on from the Wi-Fi off row', () => {
      const { arg, valid } = toIssueItem({ kind: 'wifi-off', device: 'en0' }, icons);

      expect(valid).not.toBe(false);
      expect(NetworkActionSchema.parse(JSON.parse(String(arg)))).toEqual({ kind: 'power-on', device: 'en0' });
    });

    it("should show networksetup's error without offering an action", () => {
      const message = 'en0 is not a Wi-Fi interface.';

      expect(toIssueItem({ kind: 'networksetup-failed', message }, icons)).toMatchObject({
        subtitle: message,
        valid: false,
        text: { copy: message, largetype: message },
      });
    });

    it.each(['no-wifi-interface', 'no-saved-networks'] as const)('should not offer an action for %s', (kind) => {
      expect(toIssueItem({ kind }, icons).valid).toBe(false);
    });
  });
});
