import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { parse } from 'plist';
import { TABLE_PLUS_DB_FILE } from '../config/constants';
import { TablePlusConfig } from '../models/table-plus-config.model';

export async function getTablePlusConnections(): Promise<TablePlusConfig[]> {
  const filePath = resolve(cwd(), TABLE_PLUS_DB_FILE);

  const rawData = await readFile(filePath, 'utf-8');
  const jsonData = parse(rawData) as never as TablePlusConfig[];

  return jsonData;
}
