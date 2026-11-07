import { GEOCODE_TTL, GEOCODING_URL } from '../../config/constants';
import { type GeocodingResult, geocodingResponseSchema } from '../../models/open-meteo.schema';
import { type Place, placeSchema } from '../../models/place.model';
import { type Cache, loadCached } from '../system/cache.service';
import { fetchJson } from '../system/http.service';

export async function searchPlaces(query: string, count: number): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({ name: query, count: String(count), language: 'en', format: 'json' });
  const body = await fetchJson(`${GEOCODING_URL}?${params}`, 'Open-Meteo');
  return geocodingResponseSchema.parse(body).results;
}

/** The saved line stays the name, since it is what the user wrote and expects to see */
export async function geocodeSavedName(cache: Cache, name: string): Promise<Place | null> {
  return loadCached<Place | null>(
    cache,
    `geocode:${name.toLowerCase()}`,
    GEOCODE_TTL,
    placeSchema,
    async () => {
      const [match] = await searchPlaces(name, 1);
      return match ? { name, latitude: match.latitude, longitude: match.longitude } : null;
    },
    (place) => place !== null,
  );
}
