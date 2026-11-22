import { randomBytes } from 'node:crypto';
import type { WriteStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlobReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import type { Entry, FileEntry } from '@zip.js/zip.js';
import type { ZipSource } from '../models/zip-source.model';
import { writeEncryptedZip } from './zip-writer.service';

const { writeStreams } = vi.hoisted(() => ({ writeStreams: [] as WriteStream[] }));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    createWriteStream: (...args: Parameters<typeof actual.createWriteStream>): WriteStream => {
      const stream = actual.createWriteStream(...args);
      writeStreams.push(stream);
      return stream;
    },
  };
});

const PASSWORD = 'correct-horse';
const REPORT_TEXT = 'Quarterly report\n';
/** Even seconds, since a zip's DOS time field only holds even seconds */
const OLD_DATE = new Date('2020-01-02T03:04:06Z');
const NEW_DATE = new Date('2026-11-22T10:20:30Z');

async function readEntries(path: string): Promise<Entry[]> {
  const data = await readFile(path);
  const reader = new ZipReader(new BlobReader(new Blob([data])));
  const entries = await reader.getEntries();
  await reader.close();

  return entries;
}

function isFileEntry(entry: Entry): entry is FileEntry {
  return !entry.directory;
}

async function readContent(entries: Entry[], name: string, password: string): Promise<Buffer> {
  const entry = entries.filter(isFileEntry).find(({ filename }) => filename === name);
  if (!entry) {
    throw new Error(`no file entry named ${name}`);
  }

  const bytes = await entry.getData(new Uint8ArrayWriter(), { password });
  return Buffer.from(bytes);
}

describe('zip-writer.service', () => {
  let dir: string;
  let out: string;
  let binary: Buffer;
  let sources: ZipSource[];

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'encrypt-files-writer-'));
    out = join(dir, 'out');
    binary = randomBytes(64 * 1024);
    await mkdir(join(dir, 'Photos'));
    await mkdir(out);
    await writeFile(join(dir, 'Report.txt'), REPORT_TEXT);
    await writeFile(join(dir, 'Photos', 'image.bin'), binary);
    sources = [
      {
        kind: 'file',
        entryName: 'Report.txt',
        sourcePath: join(dir, 'Report.txt'),
        size: REPORT_TEXT.length,
        lastModDate: OLD_DATE,
        mode: 0o100755,
      },
      { kind: 'directory', entryName: 'Photos/', lastModDate: OLD_DATE, mode: 0o40755 },
      {
        kind: 'file',
        entryName: 'Photos/image.bin',
        sourcePath: join(dir, 'Photos', 'image.bin'),
        size: binary.length,
        lastModDate: NEW_DATE,
        mode: 0o100644,
      },
    ];
  });

  afterEach(async () => {
    await chmod(join(dir, 'Report.txt'), 0o644);
    await rm(dir, { recursive: true, force: true });
  });

  describe('writeEncryptedZip', () => {
    it('should round-trip every file with the right password', async () => {
      const destination = join(out, 'Archive.zip');

      await writeEncryptedZip(sources, destination, PASSWORD);

      const entries = await readEntries(destination);
      const report = await readContent(entries, 'Report.txt', PASSWORD);
      const image = await readContent(entries, 'Photos/image.bin', PASSWORD);
      expect(entries.map(({ filename }) => filename)).toEqual(['Report.txt', 'Photos/', 'Photos/image.bin']);
      expect(report.toString()).toBe(REPORT_TEXT);
      expect(image.equals(binary)).toBe(true);
    });

    it('should encrypt every file entry with AES-256', async () => {
      const destination = join(out, 'Archive.zip');

      await writeEncryptedZip(sources, destination, PASSWORD);

      const entries = await readEntries(destination);
      const files = entries.filter(isFileEntry);
      expect(files).toHaveLength(2);
      for (const entry of files) {
        expect(entry.encrypted).toBe(true);
        expect(entry.zipCrypto).toBe(false);
        expect(entry.extraFieldAES?.strength).toBe(3);
      }
    });

    it('should reject a wrong password', async () => {
      const destination = join(out, 'Archive.zip');

      await writeEncryptedZip(sources, destination, PASSWORD);

      const entries = await readEntries(destination);
      const reading = readContent(entries, 'Report.txt', 'wrong-password');
      await expect(reading).rejects.toThrow(/Invalid password/);
    });

    it('should keep each entry date and permissions, like Finder', async () => {
      const destination = join(out, 'Archive.zip');

      await writeEncryptedZip(sources, destination, PASSWORD);

      const entries = await readEntries(destination);
      const kept = entries.map(({ filename, lastModDate, unixMode }) => ({ filename, lastModDate, unixMode }));
      expect(kept).toEqual([
        { filename: 'Report.txt', lastModDate: OLD_DATE, unixMode: 0o100755 },
        { filename: 'Photos/', lastModDate: OLD_DATE, unixMode: 0o40755 },
        { filename: 'Photos/image.bin', lastModDate: NEW_DATE, unixMode: 0o100644 },
      ]);
    });

    it('should leave nothing behind when a file is unreadable, and name that file', async () => {
      const destination = join(out, 'Archive.zip');
      await chmod(join(dir, 'Report.txt'), 0o000);

      const writing = writeEncryptedZip(sources, destination, PASSWORD);

      await expect(writing).rejects.toMatchObject({ code: 'EACCES', path: join(dir, 'Report.txt') });
      const left = await readdir(out);
      expect(left).toEqual([]);
    });

    it('should close the output file when a source fails, so no file handle stays open', async () => {
      writeStreams.length = 0;
      await chmod(join(dir, 'Report.txt'), 0o000);

      const writing = writeEncryptedZip(sources, join(out, 'Archive.zip'), PASSWORD);

      await expect(writing).rejects.toMatchObject({ code: 'EACCES' });
      expect(writeStreams.map(({ destroyed }) => destroyed)).toEqual([true]);
    });
  });
});
