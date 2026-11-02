import { CalendarEntity } from '../models/access-status.enum';

const PRIVACY_SETTINGS_URL = 'x-apple.systempreferences:com.apple.preference.security';

export function toEventUrl(eventIdentifier: string): string {
  return `ical://ekevent/${encodeURIComponent(eventIdentifier)}?method=show&options=more`;
}

export function toPrivacySettingsUrl(entity: CalendarEntity): string {
  const pane = entity === CalendarEntity.Event ? 'Privacy_Calendars' : 'Privacy_Reminders';

  return `${PRIVACY_SETTINGS_URL}?${pane}`;
}
