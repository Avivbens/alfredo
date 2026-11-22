import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { Readable, Writable } from 'node:stream';
import { ZipWriter, configure } from '@zip.js/zip.js';
import { toPartialPath } from '../common/output-path.util';
import { needsZip64 } from '../common/zip64.util';
import type { ZipSource } from '../models/zip-source.model';

/** Strength 3 is AES-256; zip.js never falls back to ZipCrypto while `zipCrypto` stays unset */
const AES_256 = 3;

configure({ useWebWorkers: false });

async function addSource(writer: ZipWriter<unknown>, source: ZipSource, password: string): Promise<void> {
  const metadata = { lastModDate: source.lastModDate, unixMode: source.mode };
  if (source.kind === 'directory') {
    await writer.add(source.entryName, undefined, { directory: true, ...metadata });
    return;
  }

  const zip64 = needsZip64(source.size);
  const content = Readable.toWeb(createReadStream(source.sourcePath));
  await writer.add(source.entryName, content, { password, encryptionStrength: AES_256, zip64, ...metadata });
}

async function writeZip(sources: ZipSource[], path: string, password: string): Promise<void> {
  const output = Writable.toWeb(createWriteStream(path));
  const writer = new ZipWriter(output);

  for (const source of sources) {
    await addSource(writer, source, password);
  }

  await writer.close();
}

export async function writeEncryptedZip(sources: ZipSource[], destination: string, password: string): Promise<void> {
  const partial = toPartialPath(destination);

  try {
    await writeZip(sources, partial, password);
    await rename(partial, destination);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}
