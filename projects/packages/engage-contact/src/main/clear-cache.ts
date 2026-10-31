import { FastAlfred } from 'fast-alfred';
import { CACHE_CONTACTS_KEY } from '../common/constants';

(() => {
  const alfredClient = new FastAlfred();

  alfredClient.cache.delete(CACHE_CONTACTS_KEY);

  alfredClient.output({
    items: [
      {
        title: 'Cache Cleared ✅',
        subtitle: 'Contacts will be re-fetched on next use',
      },
    ],
  });
})();
