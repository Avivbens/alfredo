import { alfredSchemas } from 'fast-alfred/schemas';
import { z } from 'zod';
import { LlmSettingsSchema, toLlmSettings } from '@alfredo/llm';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { MapProvider, MapProviderSchema } from './map-provider.enum';
import { OpenEventPlatform, OpenEventPlatformSchema } from './open-event-platform.enum';

export const SettingsSchema = LlmSettingsSchema.extend({
  slice_amount: alfredSchemas.number().default(10),
  calendar_name: z.string().default(''),
  should_open_new_event: alfredSchemas.checkbox().default(false),
  open_new_event_platform: OpenEventPlatformSchema.default(OpenEventPlatform.APPLE_CALENDAR),
  map_provider: MapProviderSchema.default(MapProvider.OFF),
  reminder_list_name: z.string().default(''),
  should_open_new_reminder: alfredSchemas.checkbox().default(false),
  agenda_calendars: alfredSchemas.lines().default([]),
  agenda_show_reminders: alfredSchemas.checkbox().default(true),
  event_alert_minutes: z
    .string()
    .default('')
    .refine((value) => value.trim() === '' || /^[1-9]\d*$/.test(value.trim()), {
      message: 'Must be a positive whole number of minutes, or empty',
    }),
}).transform((env) => ({
  ...toLlmSettings(env, DEFAULT_DEBOUNCE_TIME),
  sliceAmount: env.slice_amount,
  calendarName: env.calendar_name,
  openNewEvent: env.should_open_new_event,
  openEventPlatform: env.open_new_event_platform,
  mapProvider: env.map_provider,
  /** An empty list name is valid - it falls back to the Reminders default list. */
  reminderListName: env.reminder_list_name.trim() || undefined,
  openNewReminder: env.should_open_new_reminder,
  agendaCalendars: env.agenda_calendars,
  agendaShowReminders: env.agenda_show_reminders,
  eventAlertMinutes: env.event_alert_minutes.trim() === '' ? undefined : Number(env.event_alert_minutes.trim()),
}));
