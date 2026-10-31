import type { AlfredScriptFilter, IconService } from 'fast-alfred';
import type { AppRouter } from '../models/routes.model';
import type { Settings } from '../models/settings.model';
import { toResultItems } from './file-item.service';
import { loadResults } from './result-loader.service';
import { SEARCH_CACHE_SECONDS } from './search.config';
import { searchInFileSystem } from './search.service';

export async function loadSearchOutput(
  input: string,
  settings: Settings,
  icons: IconService,
  router: AppRouter,
): Promise<AlfredScriptFilter> {
  const results = await searchInFileSystem({ ...settings.search, name: input });
  const rows = await loadResults(results, settings.sliceAmount, settings.search.searchWorktrees);

  return {
    items: rows.flatMap((row) => toResultItems(row, icons, router)),
    cache: { seconds: SEARCH_CACHE_SECONDS },
  };
}
