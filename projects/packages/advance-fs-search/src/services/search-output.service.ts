import type { AlfredScriptFilter } from 'fast-alfred';
import type { AlfredIcons } from '../models/alfred.model';
import type { Settings } from '../models/settings.model';
import { toWorktreeVariables } from '../models/worktree-repos.model';
import { toResultItems } from './file-item.service';
import { loadResults } from './result-loader.service';
import { SEARCH_CACHE_SECONDS } from './search.config';
import { searchInFileSystem } from './search.service';

export async function loadSearchOutput(
  input: string,
  settings: Settings,
  icons: AlfredIcons,
): Promise<AlfredScriptFilter> {
  const results = await searchInFileSystem({ ...settings.search, name: input });
  const { rows, repos } = await loadResults(results, settings.sliceAmount, settings.search.searchWorktrees);

  return {
    items: rows.flatMap((row) => toResultItems(row, icons)),
    variables: toWorktreeVariables(repos),
    cache: { seconds: SEARCH_CACHE_SECONDS },
  };
}
