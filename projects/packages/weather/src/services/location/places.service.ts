import { matches } from 'fast-alfred';
import type { Cache } from '@alfredo/cache';
import { toErrorMessage } from '../../common/error.util';
import type { ResolvedPlace } from '../../models/place.model';
import type { Settings } from '../../models/settings.model';
import type { WeatherIssue } from '../../models/weather-issue.schema';
import { geocodeSavedName } from '../open-meteo/geocoding.service';
import { loadCurrentPlace } from './ip-location.service';
import { parseSavedPlace } from './saved-places.service';

export type PlaceEntry = { kind: 'place'; place: ResolvedPlace } | { kind: 'issue'; issue: WeatherIssue };

export type PlaceItemEntry = Extract<PlaceEntry, { kind: 'place' }>;

export function isPlaceEntry(entry: PlaceEntry): entry is PlaceItemEntry {
  return entry.kind === 'place';
}

async function resolveCurrent(cache: Cache): Promise<PlaceEntry> {
  const place = await loadCurrentPlace(cache);
  if (!place) {
    return { kind: 'issue', issue: { kind: 'location-unavailable' } };
  }

  return { kind: 'place', place: { ...place, name: `📍 ${place.name}`, source: 'current' } };
}

async function resolveSaved(cache: Cache, line: string): Promise<PlaceEntry> {
  const saved = parseSavedPlace(line);
  if (saved.kind === 'coordinates') {
    return { kind: 'place', place: { ...saved.place, source: 'saved' } };
  }

  try {
    const place = await geocodeSavedName(cache, saved.name);
    if (!place) {
      return { kind: 'issue', issue: { kind: 'place-not-found', name: saved.name } };
    }

    return { kind: 'place', place: { ...place, source: 'saved' } };
  } catch (error) {
    return { kind: 'issue', issue: { kind: 'request-failed', name: saved.name, message: toErrorMessage(error) } };
  }
}

export async function resolvePlaces(
  cache: Cache,
  { saved_places, show_current_location }: Pick<Settings, 'saved_places' | 'show_current_location'>,
): Promise<PlaceEntry[]> {
  if (!saved_places.length && !show_current_location) {
    return [{ kind: 'issue', issue: { kind: 'no-places' } }];
  }

  const current = show_current_location ? [resolveCurrent(cache)] : [];
  return Promise.all([...current, ...saved_places.map((line) => resolveSaved(cache, line))]);
}

export function filterPlaceEntries(entries: PlaceEntry[], input: string): PlaceEntry[] {
  const query = input.trim();
  if (!query) {
    return entries;
  }

  return matches(query, entries.filter(isPlaceEntry), ({ place }) => place.name);
}
