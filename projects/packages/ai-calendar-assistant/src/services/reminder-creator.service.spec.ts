import { Reminder } from '../models/reminder.model';
import * as dateService from './date.service';
import { reminderCreatorAppleScript } from './reminder-creator.service';

// Spy on dateService functions
jest.spyOn(dateService, 'formatDateToAppleScript');

describe('reminderCreatorAppleScript', () => {
  const listName = 'Test List';
  const timedReminder: Reminder = {
    title: 'Call the bank',
    dueDate: new Date('2026-08-14T09:00:00.000Z'),
    allDay: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
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
