export function formatDateToAppleScript(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-GB'); // Use en-GB for HH:mm:ss format
  return `date "${day} ${month} ${year} ${time}"`;
}

export function formatGoogleDate(date: Date, allDay: boolean, timeZone = 'UTC'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  };

  if (!allDay) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const partValue = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';

  const year = partValue('year');
  const month = partValue('month');
  const day = partValue('day');

  if (allDay) {
    return `${year}${month}${day}`;
  }

  const hour = partValue('hour');
  const minute = partValue('minute');
  const second = partValue('second');

  return `${year}${month}${day}T${hour}${minute}${second}`;
}

export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Build a "floating" Date whose machine-local wall-clock equals the absolute
 * moment's wall-clock at the given IANA timezone. Used for display surfaces
 * (Alfred subtitle, etc.) that read local Date methods — feeding them this
 * Date makes them render the event's location wall-clock.
 *
 * For events in the user's machine timezone this is effectively a re-parse,
 * since the wall-clock at the machine timezone is already what local methods
 * would return.
 */
export function dateInTimezoneAsLocal(date: Date, timeZone: string = getCurrentTimezone()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '0';

  return new Date(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
}

export function dateTimezoneNatural(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const currentDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

  return currentDate;
}

export function beautifyDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeString = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (inputDate.getTime() === today.getTime()) {
    return `Today, ${timeString}`;
  }

  if (inputDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow, ${timeString}`;
  }

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  if (inputDate > today && inputDate < nextWeek) {
    return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${timeString}`;
  }

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }

  return `${date.toLocaleDateString('en-US', options)}, ${timeString}`;
}
