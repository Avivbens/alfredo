import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { toRouteLabel } from '../common/route.util';
import { ROUTES } from '../models/routes.model';
import { settingsSchema } from '../models/settings.model';
import type { ForecastResult } from '../services/forecast/forecast-store.model';
import { loadForecasts } from '../services/forecast/forecast-store.service';
import { toDaysOutput } from '../services/items/day-items.service';
import { toHoursOutput } from '../services/items/hour-items.service';
import { toPlacesOutput } from '../services/items/place-items.service';
import { filterPlaceEntries, isPlaceEntry, resolvePlaces } from '../services/location/places.service';

const NOT_LOADED: ForecastResult = { kind: 'failed', message: 'No forecast was loaded' };

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('weather'));

  try {
    const settings = alfredClient.env.parse(settingsSchema);
    const { cache, icons, input } = alfredClient;
    const router = alfredClient.router(ROUTES);
    const route = router.match();
    const now = Date.now();

    switch (route?.name) {
      case 'days': {
        const place = { ...route.state, name: toRouteLabel(input, route.filter) };
        const [result = NOT_LOADED] = await loadForecasts(cache, [place], now);
        alfredClient.output(toDaysOutput(place, result, icons, now, route.filter, router));
        break;
      }

      case 'hours': {
        const { date, ...place } = route.state;
        const [result = NOT_LOADED] = await loadForecasts(cache, [place], now);
        alfredClient.output(toHoursOutput(place, date, result, icons, now, route.filter));
        break;
      }

      default: {
        const entries = filterPlaceEntries(await resolvePlaces(cache, settings), input);
        const places = entries.filter(isPlaceEntry).map(({ place }) => place);
        const results = await loadForecasts(cache, places, now);
        alfredClient.output(toPlacesOutput(entries, results, icons, now, router));
      }
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
