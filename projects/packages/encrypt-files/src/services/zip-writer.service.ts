import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { Readable, Writable } from 'node:stream';
import { ZipWriter, configure } from '@zip.js/zip.js';
import type { ZipWriterAddDataOptions } from '@zip.js/zip.js';
import { toPartialPath } from '../common/output-path.util';
import { needsContentsZip64, needsZip64 } from '../common/zip64.util';
import type { ZipSource } from '../models/zip-source.model';

/** Strength 3 is AES-256; zip.js never falls back to ZipCrypto while `zipCrypto` stays unset */
const AES_256 = 3;
const CONTENTS_NAME = 'Contents.zip';

type EntryEncryption = Pick<ZipWriterAddDataOptions, 'password' | 'encryptionStrength'>;
type WriteOptions = { hideNames?: boolean };

configure({ useWebWorkers: false });

function toEncryption(password: string): EntryEncryption {
  return { password, encryptionStrength: AES_256 };
}

async function addSource(writer: ZipWriter<unknown>, source: ZipSource, encryption: EntryEncryption): Promise<void> {
  const metadata = { lastModDate: source.lastModDate, unixMode: source.mode };
  if (source.kind === 'directory') {
    await writer.add(source.entryName, undefined, { directory: true, ...metadata });
    return;
  }

  const zip64 = needsZip64(source.size);
  const content = Readable.toWeb(createReadStream(source.sourcePath));
  await writer.add(source.entryName, content, { ...encryption, zip64, ...metadata });
}

async function addSources(
  writer: ZipWriter<unknown>,
  sources: ZipSource[],
  encryption: EntryEncryption,
): Promise<void> {
  for (const source of sources) {
    await addSource(writer, source, encryption);
  }
}

async function fillInnerZip(writable: WritableStream<Uint8Array>, sources: ZipSource[]): Promise<void> {
  const inner = new ZipWriter(writable);

  await addSources(inner, sources, {});
  await inner.close();
}

/** The plain inner zip streams straight into the encrypted entry, so its file names never touch the disk unencrypted */
async function addHiddenSources(writer: ZipWriter<unknown>, sources: ZipSource[], password: string): Promise<void> {
  const zip64 = needsContentsZip64(sources);
  const pipe = new TransformStream<Uint8Array, Uint8Array>();

  const adding = writer.add(CONTENTS_NAME, pipe.readable, { ...toEncryption(password), level: 0, zip64 });
  const filling = fillInnerZip(pipe.writable, sources);
  await Promise.all([filling, adding]);
}

/** Destroyed only on failure: on success `close()` flushes it, and destroying it there could cut off the last write */
async function writeZip(sources: ZipSource[], path: string, password: string, hideNames: boolean): Promise<void> {
  const file = createWriteStream(path);
  const writer = new ZipWriter(Writable.toWeb(file));

  try {
    if (hideNames) {
      await addHiddenSources(writer, sources, password);
    } else {
      await addSources(writer, sources, toEncryption(password));
    }

    await writer.close();
  } catch (error) {
    file.destroy();
    throw error;
  }
}

export async function writeEncryptedZip(
  sources: ZipSource[],
  destination: string,
  password: string,
  { hideNames = false }: WriteOptions = {},
): Promise<void> {
  const partial = toPartialPath(destination);

  try {
    await writeZip(sources, partial, password, hideNames);
    await rename(partial, destination);
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}
