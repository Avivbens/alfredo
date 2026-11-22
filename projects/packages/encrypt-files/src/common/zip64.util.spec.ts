import { describe, expect, it } from 'vitest';
import { needsZip64 } from './zip64.util';

const MIB = 1024 ** 2;

describe('zip64.util', () => {
  describe('needsZip64', () => {
    it('should switch on for a file just under 4 GiB, since deflate can grow incompressible data past the limit', () => {
      const needed = needsZip64(4095 * MIB);

      expect(needed).toBe(true);
    });

    it('should stay off for an ordinary large file, so the zip opens in the most tools', () => {
      const needed = needsZip64(3 * 1024 * MIB);

      expect(needed).toBe(false);
    });
  });
});
