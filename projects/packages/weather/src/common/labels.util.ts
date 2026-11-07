import { addDays, format, parseISO } from 'date-fns';
import { toCompass } from './wind.util';

const SEGMENT_SEPARATOR = ' · ';
export const WORD_SEPARATOR = ' ';
export const LIST_SEPARATOR = ', ';
export const LINE_SEPARATOR = '\n';
const CLOCK_FORMAT = 'HH:mm';

/** Rain below this rounds to nothing worth showing */
const MIN_SHOWN_AMOUNT = 0.1;

function toOneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°`;
}

export function formatAmount(value: number, unit: 'mm' | 'cm' = 'mm'): string {
  const amount = value < 10 ? toOneDecimal(value) : String(Math.round(value));
  return `${amount} ${unit}`;
}

export function formatUv(uv: number): string {
  return `UV ${toOneDecimal(uv)}`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes} min`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${Math.round(meters / 1000)} km`;
}

export function formatClock(localIso: string): string {
  const time = parseISO(localIso);
  return format(time, CLOCK_FORMAT);
}

/** Open-Meteo times are the place's local wall clock with no offset, so "now" is shifted the same way to compare them as strings */
export function toPlaceNow(utcOffsetSeconds: number, now: number): string {
  return new Date(now + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

export function formatDayLabel(date: string, today: string): string {
  if (date === today) {
    return 'Today';
  }

  if (date === format(addDays(parseISO(today), 1), 'yyyy-MM-dd')) {
    return 'Tomorrow';
  }

  return format(parseISO(date), 'EEE d MMM');
}

export function formatRain(probability: number | null, amount: number | null): string | null {
  const parts = [
    probability === null ? null : `${Math.round(probability)}%`,
    amount === null || amount < MIN_SHOWN_AMOUNT ? null : formatAmount(amount),
  ].filter(Boolean);

  if (!parts.length) {
    return null;
  }

  return `Rain ${parts.join(' ')}`;
}

export function formatWind(speed: number | null, direction: number | null, gusts: number | null): string | null {
  if (speed === null) {
    return null;
  }

  const heading = direction === null ? '' : ` ${toCompass(direction)}`;
  const gustLabel = gusts === null ? '' : `, gusts ${Math.round(gusts)}`;
  return `Wind ${Math.round(speed)} km/h${heading}${gustLabel}`;
}

/** `fetchedAt` is a real instant, so it shows in the Mac's own time, unlike the place-local forecast times */
export function formatOffline(fetchedAt: number): string {
  return `Offline · updated ${format(fetchedAt, CLOCK_FORMAT)}`;
}

export function joinSegments(
  segments: Array<string | null | undefined | false>,
  separator = SEGMENT_SEPARATOR,
): string {
  return segments.filter(Boolean).join(separator);
}
