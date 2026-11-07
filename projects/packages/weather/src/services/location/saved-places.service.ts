import type { Place } from '../../models/place.model';

export type SavedPlace = { kind: 'coordinates'; place: Place } | { kind: 'name'; name: string };

const COORDINATES_LINE = /^(.+?):\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

function isOnEarth(latitude: number, longitude: number): boolean {
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function parseSavedPlace(line: string): SavedPlace {
  const [, label, latitudeText, longitudeText] = COORDINATES_LINE.exec(line) ?? [];
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!label || !latitudeText || !longitudeText || !isOnEarth(latitude, longitude)) {
    return { kind: 'name', name: line };
  }

  return { kind: 'coordinates', place: { name: label.trim(), latitude, longitude } };
}
