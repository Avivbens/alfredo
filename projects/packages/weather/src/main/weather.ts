import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { settingsSchema } from '../models/settings.model';
import { loadForecasts } from '../services/forecast/forecast-store.service';
import { toPlacesOutput } from '../services/items/place-items.service';
import { filterPlaceEntries, isPlaceEntry, resolvePlaces } from '../services/location/places.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('weather'));

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const { cache, icons, input } = alfredClient;

    const entries = filterPlaceEntries(await resolvePlaces(cache, settings), input);
    const places = entries.filter(isPlaceEntry).map(({ place }) => place);
    const now = Date.now();
    const results = await loadForecasts(cache, places, now);

    alfredClient.output(toPlacesOutput(entries, results, icons, now));
  } catch (error) {
    alfredClient.error(error);
  }
})();
