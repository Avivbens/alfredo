import { describe, expect, it } from 'vitest';
import { CalendarEntity } from '../models/access-status.enum';
import { toEventUrl, toPrivacySettingsUrl } from './calendar-links.util';

describe('calendar-links.util', () => {
  describe('toEventUrl', () => {
    it('should encode a colon and a slash in the identifier', () => {
      expect(toEventUrl('ABC:123/x')).toBe('ical://ekevent/ABC%3A123%2Fx?method=show&options=more');
    });
  });

  describe('toPrivacySettingsUrl', () => {
    it('should point events at the calendars pane', () => {
      expect(toPrivacySettingsUrl(CalendarEntity.Event)).toBe(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars',
      );
    });

    it('should point reminders at the reminders pane', () => {
      expect(toPrivacySettingsUrl(CalendarEntity.Reminder)).toBe(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Reminders',
      );
    });
  });
});
