export function formatDateToAppleScript(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-GB'); // Use en-GB for HH:mm:ss format
  return `date "${day} ${month} ${year} ${time}"`;
}

export function formatGoogleDate(date: Date, allDay: boolean): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
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

export function dropTimezone(date: Date): Date {
  const timezoneOffset = new Date().getTimezoneOffset() / -60;
  const adjustedDate = new Date(date);
  adjustedDate.setHours(adjustedDate.getHours() - timezoneOffset);
  return adjustedDate;
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
