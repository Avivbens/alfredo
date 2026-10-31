import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { CACHE_BOOKMARKS_KEY, CACHE_TTL } from '../common/constants';
import { IUIBookmark } from '../models/bookmark.schema';
import { SettingsSchema } from '../models/settings.schema';
import { getBookmarks } from '../services/fetch-bookmarks';
import { searchBookmarks } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('search-bookmark'));

  const { profiles, sliceAmount, fuzzyThreshold } = alfredClient.env.parse(SettingsSchema);

  try {
    let bookmarks: IUIBookmark[] | null = alfredClient.cache.get<IUIBookmark[]>(CACHE_BOOKMARKS_KEY);
    if (!bookmarks) {
      bookmarks = await getBookmarks(profiles);
      alfredClient.cache.setWithTTL(CACHE_BOOKMARKS_KEY, bookmarks, { maxAge: CACHE_TTL });
    }

    const filteredBookmarks = await searchBookmarks(bookmarks, alfredClient.input, sliceAmount, fuzzyThreshold);

    const items: AlfredListItem[] = filteredBookmarks.map(({ name, url, profile }) => {
      const subtitle = `[${profile}] - ${url}`;

      return {
        title: name,
        subtitle,
        arg: JSON.stringify({ url, profile }),
        mods: {
          cmd: {
            subtitle: `Open in Incognito Mode`,
            arg: JSON.stringify({ url, profile, incognito: true }),
          },
        },
        uid: subtitle,
      };
    });

    const sliced = items.slice(0, sliceAmount);

    alfredClient.output({ items: sliced });
  } catch (error) {
    alfredClient.error(error);
  }
})();
