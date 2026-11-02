import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAppleScript } from '@alfredo/run-applescript';
import { ACCESS_JXA } from '../common/jxa/access.jxa';
import { CREATE_REMINDER_JXA } from '../common/jxa/create-reminder.jxa';
import { reminderPayloadSchema } from '../models/eventkit.schema';
import type { ReminderPayload } from '../models/eventkit.schema';
import { Reminder } from '../models/reminder.model';
import * as dateService from './date.service';
import { createReminder, reminderCreatorAppleScript } from './reminder-creator.service';

// Mock runAppleScript, keeping the real escaping so the generated script is asserted as-is
vi.mock('@alfredo/run-applescript', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@alfredo/run-applescript')>()),
  runAppleScript: vi.fn(),
}));

// Spy on dateService functions
vi.spyOn(dateService, 'formatDateToAppleScript');

/** Raw ACCESS_JXA and CREATE_REMINDER_JXA output: statuses come back as EKAuthorizationStatus numbers. */
const FULL_ACCESS = '{"event":2,"reminder":3}';
const DENIED = '{"event":3,"reminder":2}';
const UNDETERMINED = '{"event":3,"reminder":0}';
const SAVED = '{"ok":true,"id":"REMINDER-1"}';

type EventKitReplies = { access: string; request?: string; create?: string; showError?: Error };

/** Mirrors ACCESS_JXA: a request returns the entity's status as is, and only an undetermined one gets the prompt's answer. */
function toAccessReply(access: string, request: string, arg = '{}'): string {
  const { mode, entity } = JSON.parse(arg);
  if (mode !== 'request') {
    return access;
  }

  const status = String(JSON.parse(access)[entity]);
  return status === '0' ? request : status;
}

function mockEventKit({ access, request = '2', create = SAVED, showError }: EventKitReplies): void {
  vi.mocked(runAppleScript).mockImplementation(async (script, options) => {
    if (script === ACCESS_JXA) {
      return toAccessReply(access, request, options?.args?.[0]);
    }

    if (script === CREATE_REMINDER_JXA) {
      return create;
    }

    if (showError && script.includes('show ')) {
      throw showError;
    }

    return '';
  });
}

function getCreatePayload(): ReminderPayload | undefined {
  const input = vi.mocked(runAppleScript).mock.calls.find(([script]) => script === CREATE_REMINDER_JXA)?.[1]?.args?.[0];

  return input ? reminderPayloadSchema.parse(JSON.parse(input)) : undefined;
}

function getAppleScripts(): string[] {
  return vi
    .mocked(runAppleScript)
    .mock.calls.filter(([, options]) => options?.language !== 'JavaScript')
    .map(([script]) => script);
}

describe('reminderCreatorAppleScript', () => {
  const listName = 'Test List';
  const timedReminder: Reminder = {
    title: 'Call the bank',
    dueDate: new Date('2026-08-14T09:00:00.000Z'),
    allDay: false,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a valid AppleScript for a timed reminder without opening', () => {
    const script = reminderCreatorAppleScript(listName, timedReminder, false);

    expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theDueDate', timedReminder.dueDate);
    expect(script).toContain(`tell application "Reminders"`);
    expect(script).toContain(`tell list "${listName}"`);
    expect(script).toContain(`name:"Call the bank"`);
    expect(script).toContain('make new reminder with properties');
    expect(script).not.toContain('show ');
    expect(script).not.toContain('activate');
  });

  it('should reveal the containing list and bring Reminders forward when opening', () => {
    const script = reminderCreatorAppleScript(listName, timedReminder, true);

    expect(script).toContain(`show list "${listName}"`);
    expect(script).toContain('activate');
  });

  it('should reveal the default list when opening without a configured list', () => {
    const script = reminderCreatorAppleScript(undefined, timedReminder, true);

    expect(script).toContain('show default list');
  });

  /**
   * `show <reminder>` blocks for ~35s on macOS 26 and takes the Apple event
   * connection down with it — the list is the only thing safe to reveal.
   */
  it('should never show the reminder object itself', () => {
    const script = reminderCreatorAppleScript(listName, timedReminder, true);

    expect(script).not.toContain('show newReminder');
    expect(script).not.toMatch(/show\s+reminder/);
  });

  it('should pin the alert to the due date for a timed reminder', () => {
    const script = reminderCreatorAppleScript(listName, timedReminder, false);

    expect(script).toContain('due date:theDueDate');
    expect(script).toContain('remind me date:theDueDate');
    expect(script).not.toContain('allday due date:');
  });

  it('should use the all-day due date and no alert for an all-day reminder', () => {
    const script = reminderCreatorAppleScript(listName, { ...timedReminder, allDay: true }, false);

    expect(script).toContain('allday due date:theDueDate');
    expect(script).not.toContain('remind me date:');
    expect(script).not.toContain(', due date:theDueDate');
  });

  it('should omit every date property when the reminder has no due date', () => {
    const script = reminderCreatorAppleScript(listName, { title: 'Buy milk', allDay: false }, false);

    expect(dateService.formatDateToAppleScript).not.toHaveBeenCalled();
    expect(script).not.toContain('due date:');
    expect(script).not.toContain('remind me date:');
    expect(script).not.toContain('theDueDate');
    expect(script).toContain(`name:"Buy milk"`);
  });

  it('should target the default list when no list name is configured', () => {
    const script = reminderCreatorAppleScript(undefined, timedReminder, false);

    expect(script).toContain('tell default list');
    expect(script).not.toContain('tell list "');
  });

  it('should include the notes as the reminder body when provided', () => {
    const script = reminderCreatorAppleScript(listName, { ...timedReminder, notes: 'Ask about the fee' }, false);

    expect(script).toContain(`body:"Ask about the fee"`);
  });

  it('should not include a body when there are no notes', () => {
    const script = reminderCreatorAppleScript(listName, timedReminder, false);

    expect(script).not.toContain('body:');
  });

  /**
   * Reminders exposes no repeat rule to AppleScript, so the requested repetition
   * can only be written into the body.
   */
  it('should record a requested repetition in the body', () => {
    const script = reminderCreatorAppleScript(
      listName,
      { ...timedReminder, recurrence: 'every week on Sunday and Monday' },
      false,
    );

    expect(script).toContain(`body:"Repeat: every week on Sunday and Monday"`);
  });

  it('should keep both the notes and the repetition in the body', () => {
    const script = reminderCreatorAppleScript(
      listName,
      { ...timedReminder, notes: 'Window seat', recurrence: 'every week on Sunday' },
      false,
    );

    expect(script).toContain(`body:"Window seat\\n\\nRepeat: every week on Sunday"`);
  });

  /**
   * A reminder fires on the machine's local clock, so a time the user pinned to
   * another timezone must reach `formatDateToAppleScript` as the plain absolute
   * moment — it is that helper's local components that do the conversion.
   */
  it('should hand a timezone-qualified due date straight through as an absolute moment', () => {
    const dueDate = new Date('2026-08-14T20:00:00+09:00');

    reminderCreatorAppleScript(listName, { title: 'Buy a flight ticket to Amsterdam', dueDate, allDay: false }, false);

    expect(dateService.formatDateToAppleScript).toHaveBeenCalledWith('theDueDate', dueDate);
    expect(dueDate.toISOString()).toBe('2026-08-14T11:00:00.000Z');
  });

  it('should escape quotes and newlines coming from the model', () => {
    const script = reminderCreatorAppleScript(
      listName,
      { ...timedReminder, title: 'Call Joe"s office', notes: 'First line\nSecond line' },
      false,
    );

    expect(script).toContain(`name:"Call Joe\\"s office"`);
    expect(script).toContain(`body:"First line\\nSecond line"`);
  });
});

describe('createReminder', () => {
  const reminder: Reminder = {
    title: 'Water the plants',
    dueDate: new Date(2026, 10, 3, 9, 0),
    allDay: false,
    recurrence: 'every day',
    recurrenceRule: { frequency: 'daily', interval: 1 },
  };
  const options = { listName: 'Home', openAfter: false };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create through EventKit with full access', async () => {
    mockEventKit({ access: FULL_ACCESS });

    await createReminder(reminder, options);

    expect(getCreatePayload()).toEqual({
      title: 'Water the plants',
      listName: 'Home',
      due: { year: 2026, month: 11, day: 3, hour: 9, minute: 0 },
      alarmAtDue: true,
      recurrence: { frequency: 'daily', interval: 1 },
    });
    expect(getAppleScripts()).toEqual([]);
  });

  it('should create in the default list through EventKit when no list is named', async () => {
    mockEventKit({ access: FULL_ACCESS });

    await createReminder(reminder, { ...options, listName: undefined });

    expect(getCreatePayload()).not.toHaveProperty('listName');
  });

  it('should fall back to AppleScript when denied', async () => {
    mockEventKit({ access: DENIED });

    await createReminder(reminder, options);

    expect(getCreatePayload()).toBeUndefined();
    expect(getAppleScripts()).toEqual([reminderCreatorAppleScript('Home', reminder, false)]);
    expect(getAppleScripts()[0]).toContain('Repeat: every day');
  });

  it('should request access when undetermined', async () => {
    mockEventKit({ access: UNDETERMINED, request: '3' });

    await createReminder(reminder, options);

    expect(runAppleScript).toHaveBeenCalledWith(ACCESS_JXA, {
      language: 'JavaScript',
      args: ['{"mode":"request","entity":"reminder"}'],
    });
    expect(vi.mocked(runAppleScript).mock.calls.filter(([script]) => script === ACCESS_JXA)).toHaveLength(1);
    expect(getCreatePayload()).toMatchObject({ title: 'Water the plants' });
  });

  it('should fall back to AppleScript when the request ends without access', async () => {
    mockEventKit({ access: UNDETERMINED, request: '0' });

    await createReminder(reminder, { ...options, openAfter: true });

    expect(getCreatePayload()).toBeUndefined();
    expect(getAppleScripts()).toEqual([reminderCreatorAppleScript('Home', reminder, true)]);
  });

  it('should show the list in Reminders after saving when openAfter is set', async () => {
    mockEventKit({ access: FULL_ACCESS });

    await createReminder(reminder, { ...options, openAfter: true });

    expect(getCreatePayload()).toMatchObject({ title: 'Water the plants' });
    expect(getAppleScripts()).toHaveLength(1);
    expect(getAppleScripts()[0]).toContain('show list "Home"');
    expect(getAppleScripts()[0]).not.toContain('make new reminder');
  });

  it('should show the default list after saving when no list is named', async () => {
    mockEventKit({ access: FULL_ACCESS });

    await createReminder(reminder, { listName: undefined, openAfter: true });

    expect(getAppleScripts()[0]).toContain('show default list');
  });

  it('should say the reminder was saved when its list fails to show', async () => {
    mockEventKit({
      access: FULL_ACCESS,
      showError: Object.assign(new Error('Command failed'), { stderr: 'Not allowed' }),
    });

    await expect(createReminder(reminder, { ...options, openAfter: true })).rejects.toThrow(
      'Created the reminder but failed to show its list: Not allowed',
    );
    expect(getCreatePayload()).toMatchObject({ title: 'Water the plants' });
  });

  it('should report a missing list by name', async () => {
    mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"list-not-found","detail":"Home"}' });

    await expect(createReminder(reminder, { ...options, openAfter: true })).rejects.toThrow(
      'Reminders list "Home" was not found or is read-only',
    );
    expect(getAppleScripts()).toEqual([]);
  });

  it('should report a missing default list when no list is named', async () => {
    mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"list-not-found","detail":""}' });

    await expect(createReminder(reminder, { listName: undefined, openAfter: false })).rejects.toThrow(
      'No default list for new reminders',
    );
  });

  it('should report a failed save with its detail', async () => {
    mockEventKit({ access: FULL_ACCESS, create: '{"ok":false,"error":"save-failed","detail":"No due date"}' });

    await expect(createReminder(reminder, options)).rejects.toThrow('Failed to save the reminder: No due date');
  });
});
