import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectEntries } from './collect-entries.service';

const REPORT_TEXT = 'Quarterly report\n';
const TAX_NAME = 'Tax "2025" ✨ מס.pdf';
const OLD_DATE = new Date('2020-01-02T03:04:06Z');

describe('collect-entries.service', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'encrypt-files-collect-'));
    await mkdir(join(dir, 'Photos', 'Empty'), { recursive: true });
    await mkdir(join(dir, 'a'));
    await mkdir(join(dir, 'b'));
    await mkdir(join(dir, 'c'));
    await writeFile(join(dir, 'Report.txt'), REPORT_TEXT);
    await writeFile(join(dir, 'Photos', 'note.txt'), 'note');
    await writeFile(join(dir, 'Photos', '.DS_Store'), 'finder');
    await symlink(join(dir, 'Report.txt'), join(dir, 'Photos', 'link'));
    await writeFile(join(dir, 'a', 'notes.txt'), 'a');
    await writeFile(join(dir, 'b', 'notes.txt'), 'b');
    await writeFile(join(dir, 'c', 'Notes.txt'), 'C');
    await writeFile(join(dir, TAX_NAME), 'tax');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('collectEntries', () => {
    it('should list a folder recursively without .DS_Store or symlinks', async () => {
      const sources = await collectEntries([join(dir, 'Photos')]);

      expect(sources.map(({ entryName }) => entryName)).toEqual(['Photos/', 'Photos/Empty/', 'Photos/note.txt']);
    });

    it('should rename a second top-level item with the same name', async () => {
      const sources = await collectEntries([join(dir, 'a', 'notes.txt'), join(dir, 'b', 'notes.txt')]);

      expect(sources.map(({ entryName }) => entryName)).toEqual(['notes.txt', 'notes 2.txt']);
    });

    it('should rename names that differ only in case, since Finder would overwrite one on extract', async () => {
      const sources = await collectEntries([join(dir, 'a', 'notes.txt'), join(dir, 'c', 'Notes.txt')]);

      expect(sources.map(({ entryName }) => entryName)).toEqual(['notes.txt', 'Notes 2.txt']);
    });

    it('should keep unusual names unchanged', async () => {
      const sources = await collectEntries([join(dir, TAX_NAME)]);

      expect(sources.map(({ entryName }) => entryName)).toEqual([TAX_NAME]);
    });

    it('should skip a selected symlink', async () => {
      const sources = await collectEntries([join(dir, 'Photos', 'link')]);

      expect(sources).toEqual([]);
    });

    it('should report size, path, date and permissions of a file', async () => {
      await chmod(join(dir, 'Report.txt'), 0o755);
      await utimes(join(dir, 'Report.txt'), OLD_DATE, OLD_DATE);

      const sources = await collectEntries([join(dir, 'Report.txt')]);

      expect(sources).toEqual([
        {
          kind: 'file',
          entryName: 'Report.txt',
          sourcePath: join(dir, 'Report.txt'),
          size: REPORT_TEXT.length,
          lastModDate: OLD_DATE,
          mode: 0o100755,
        },
      ]);
    });

    it('should carry a folder date too', async () => {
      await utimes(join(dir, 'Photos', 'Empty'), OLD_DATE, OLD_DATE);

      const sources = await collectEntries([join(dir, 'Photos', 'Empty')]);

      expect(sources).toEqual([{ kind: 'directory', entryName: 'Empty/', lastModDate: OLD_DATE, mode: 0o40755 }]);
    });

    it('should skip a named pipe, since reading one blocks forever', async () => {
      execFileSync('mkfifo', [join(dir, 'Photos', 'pipe')]);

      const sources = await collectEntries([join(dir, 'Photos')]);

      expect(sources.map(({ entryName }) => entryName)).toEqual(['Photos/', 'Photos/Empty/', 'Photos/note.txt']);
    });
  });
});
