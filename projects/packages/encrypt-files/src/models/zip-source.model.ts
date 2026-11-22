type EntryMetadata = { entryName: string; lastModDate: Date; mode: number };

export type ZipSource =
  ({ kind: 'directory' } & EntryMetadata) | ({ kind: 'file'; sourcePath: string; size: number } & EntryMetadata);
