import { describe, expect, it } from 'vitest';
import type { ZipSource } from '../models/zip-source.model';
import { needsContentsZip64, needsZip64 } from './zip64.util';

const MIB = 1024 ** 2;
const DATE = new Date('2020-01-02T03:04:06Z');

function fileOf(size: number, index: number): ZipSource {
  return { kind: 'file', entryName: `f${index}`, sourcePath: `/t/f${index}`, size, lastModDate: DATE, mode: 0o100644 };
}

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

  describe('needsContentsZip64', () => {
    it('should switch on when the hidden files together come just under 4 GiB', () => {
      const sources = [fileOf(2000 * MIB, 1), fileOf(2095 * MIB, 2)];

      const needed = needsContentsZip64(sources);

      expect(needed).toBe(true);
    });

    it('should count each entry header, so many small files near the line still switch it on', () => {
      const headroom = 3840 * MIB;
      const sources = [
        fileOf(headroom - 1000 * 1024, 0),
        ...Array.from({ length: 999 }, (_, index) => fileOf(1, index + 1)),
      ];

      const needed = needsContentsZip64(sources);

      expect(needed).toBe(true);
    });

    it('should stay off for an ordinary selection', () => {
      const sources = [
        fileOf(10 * MIB, 1),
        { kind: 'directory', entryName: 'd/', lastModDate: DATE, mode: 0o40755 } as const,
      ];

      const needed = needsContentsZip64(sources);

      expect(needed).toBe(false);
    });
  });
});
