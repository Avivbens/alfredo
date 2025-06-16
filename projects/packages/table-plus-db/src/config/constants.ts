import { homedir } from 'node:os';
import { resolve } from 'node:path';

export const TABLE_PLUS_DB_FILE = resolve(
  homedir(),
  'Library',
  'Application Support',
  'com.tinyapp.TablePlus',
  'Data',
  'Connections.plist',
);
