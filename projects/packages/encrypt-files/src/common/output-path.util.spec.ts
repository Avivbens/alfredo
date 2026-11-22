import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findFreePath, toArchiveName, toPartialPath, withSuffix } from './output-path.util';

describe('output-path.util', () => {
  describe('withSuffix', () => {
    it.each([
      ['Archive.zip', 2, 'Archive 2.zip'],
      ['Report.pdf.zip', 2, 'Report.pdf 2.zip'],
      ['Photos', 3, 'Photos 3'],
      ['.env', 2, '.env 2'],
    ])('should turn %s with %i into %s', (name, count, expected) => {
      const suffixed = withSuffix(name, count);

      expect(suffixed).toBe(expected);
    });
  });

  describe('toArchiveName', () => {
    it('should name a single file after its full name, like Finder', () => {
      const name = toArchiveName(['/t/Report.pdf']);

      expect(name).toBe('Report.pdf.zip');
    });

    it('should ignore a trailing slash on a folder', () => {
      const name = toArchiveName(['/t/Photos/']);

      expect(name).toBe('Photos.zip');
    });

    it('should name several items Archive.zip', () => {
      const name = toArchiveName(['/t/a', '/t/b']);

      expect(name).toBe('Archive.zip');
    });
  });

  describe('findFreePath', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'encrypt-files-output-'));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('should keep the name when nothing has it', async () => {
      const path = await findFreePath(dir, 'Archive.zip');

      expect(path).toBe(join(dir, 'Archive.zip'));
    });

    it('should add 2 when a file has the name', async () => {
      await writeFile(join(dir, 'Archive.zip'), '');

      const path = await findFreePath(dir, 'Archive.zip');

      expect(path).toBe(join(dir, 'Archive 2.zip'));
    });

    it('should count a folder with the name as taken', async () => {
      await writeFile(join(dir, 'Archive.zip'), '');
      await mkdir(join(dir, 'Archive 2.zip'));

      const path = await findFreePath(dir, 'Archive.zip');

      expect(path).toBe(join(dir, 'Archive 3.zip'));
    });
  });

  describe('toPartialPath', () => {
    it('should hide the partial file next to the final one', () => {
      const path = toPartialPath('/t/Archive.zip');

      expect(path).toBe('/t/.Archive.zip.partial');
    });
  });
});
