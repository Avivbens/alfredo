export interface IBookmarkRes {
  checksum: string;
  roots: IBookmarkRoot;
  sync_metadata: string;
  version: number;
}

export interface IBookmarkRoot {
  bookmark_bar: IBookmark;
  other: IBookmark;
  synced: IBookmark;
}

export interface IBookmark {
  children?: IBookmark[];
  date_added: string;
  date_last_used: string;
  date_modified?: string;
  guid: string;
  id: string;
  name: string;
  type: Type;
  url?: string;
}

export interface MetaInfo {
  power_bookmark_meta?: string;
  last_visited_desktop?: string;
}

export enum Type {
  Folder = 'folder',
  URL = 'url',
}

export interface IUIBookmark {
  name: string;
  url: string;
  type: Type;
  profile: string;
}
