import { z } from 'zod';
import { GEO_JS_URL, IP_LOCATION_CACHE_KEY, IP_LOCATION_TTL, IP_WHO_IS_URL } from '../../config/constants';
import { geoJsSchema, ipWhoIsSchema } from '../../models/ip-location.schema';
import { type Place, placeSchema } from '../../models/place.model';
import { type Cache, loadCached } from '../system/cache.service';
import { fetchJson } from '../system/http.service';

async function fromIpWhoIs(): Promise<Place> {
  const body = await fetchJson(IP_WHO_IS_URL, 'ipwho.is');
  const { city, latitude, longitude } = ipWhoIsSchema.parse(body);
  return { name: city, latitude, longitude };
}

async function fromGeoJs(): Promise<Place> {
  const body = await fetchJson(GEO_JS_URL, 'geojs');
  const { city, latitude, longitude } = geoJsSchema.parse(body);
  return { name: city, latitude, longitude };
}

const LOOKUPS = [fromIpWhoIs, fromGeoJs];

/** Free IP services go down or rate limit, so a failure only moves on to the next one and the saved places still show */
export async function locateByIp(): Promise<Place | null> {
  for (const lookup of LOOKUPS) {
    const place = await lookup().catch(() => null);
    if (place) {
      return place;
    }
  }

  return null;
}

/** A failed lookup is cached too, so a rerun or the next keystroke never asks the IP services more than once per TTL */
const currentPlaceSchema = z.object({ place: placeSchema.nullable() });

export async function loadCurrentPlace(cache: Cache): Promise<Place | null> {
  const { place } = await loadCached(
    cache,
    IP_LOCATION_CACHE_KEY,
    IP_LOCATION_TTL,
    currentPlaceSchema,
    async () => ({ place: await locateByIp() }),
    () => true,
  );

  return place;
}
