import { describe, expect, it } from 'vitest';
import { AvailableModels } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { MapProvider } from './map-provider.enum';
import { OpenEventPlatform } from './open-event-platform.enum';
import { SettingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('SettingsSchema', () => {
    it('should read the values Alfred passes from the configuration fields', () => {
      expect(
        SettingsSchema.parse({
          llm_token: 'sk-123',
          selected_model: 'gemini-3.8-flash',
          debounce_time: '400',
          slice_amount: '5',
          calendar_name: 'Work',
          should_open_new_event: '1',
          open_new_event_platform: 'apple_calendar',
          map_provider: 'off',
          reminder_list_name: '  Errands  ',
          should_open_new_reminder: '0',
        }),
      ).toEqual({
        token: 'sk-123',
        model: AvailableModels.GOOGLE_GEMINI_3_8_FLASH,
        debounceTime: 400,
        sliceAmount: 5,
        calendarName: 'Work',
        openNewEvent: true,
        openEventPlatform: OpenEventPlatform.APPLE_CALENDAR,
        mapProvider: MapProvider.OFF,
        reminderListName: 'Errands',
        openNewReminder: false,
      });
    });

    it('should fall back to the defaults, with a blank list name meaning the default Reminders list', () => {
      expect(SettingsSchema.parse({ reminder_list_name: '   ' })).toMatchObject({
        debounceTime: DEFAULT_DEBOUNCE_TIME,
        sliceAmount: 10,
        calendarName: '',
        openEventPlatform: OpenEventPlatform.APPLE_CALENDAR,
        mapProvider: MapProvider.OFF,
        reminderListName: undefined,
      });
    });
  });
});
