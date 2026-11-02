/** The bridge hands every NSInteger over as a string, counts and enum constants included. */
export type ObjCInteger = string;

export interface ObjCObject {
  isNil(): boolean;
}

/** `js` is the bridge's own unwrap, so it carries the type `ObjC.unwrap` returns. */
export interface ObjCValue<T> extends ObjCObject {
  js: T;
}

export type NSString = ObjCValue<string>;
export type NSDate = ObjCValue<Date>;
export type NSPredicate = ObjCObject;
export type NSTimeZone = ObjCObject;
export type NSURL = ObjCObject;
export type EKAlarm = ObjCObject;
export type EKRecurrenceDayOfWeek = ObjCObject;
export type EKRecurrenceEnd = ObjCObject;
export type EKRecurrenceRule = ObjCObject;
export type ObjCRef<T> = [T?];

export interface NSError extends ObjCObject {
  localizedDescription: NSString;
}

export interface NSArray<T> extends ObjCObject {
  count: ObjCInteger;
  objectAtIndex(index: number): T;
}

export interface NSMutableArray<T> extends NSArray<T> {
  addObject(item: T): void;
}

export interface NSDateComponents extends ObjCObject {
  get year(): ObjCInteger;
  set year(value: number);
  get month(): ObjCInteger;
  set month(value: number);
  get day(): ObjCInteger;
  set day(value: number);
  get hour(): ObjCInteger;
  set hour(value: number);
  get minute(): ObjCInteger;
  set minute(value: number);
}

export interface NSCalendar extends ObjCObject {
  startOfDayForDate(date: NSDate): NSDate;
  dateByAddingUnitValueToDateOptions(unit: ObjCInteger, value: number, date: NSDate, options: number): NSDate;
  dateFromComponents(components: NSDateComponents): NSDate;
}

export interface NSDateFormatter extends ObjCObject {
  timeStyle: ObjCInteger;
  dateStyle: ObjCInteger;
  setLocalizedDateFormatFromTemplate(template: string): void;
  stringFromDate(date: NSDate): NSString;
}

export interface EKCalendar extends ObjCObject {
  title: NSString;
  allowsContentModifications: boolean;
}

export interface EKEvent extends ObjCObject {
  eventIdentifier: NSString;
  get title(): NSString;
  set title(value: string);
  calendar: EKCalendar;
  get location(): NSString;
  set location(value: string);
  get notes(): NSString;
  set notes(value: string);
  URL: NSURL;
  allDay: boolean;
  timeZone: NSTimeZone;
  startDate: NSDate;
  endDate: NSDate;
  addAlarm(alarm: EKAlarm): void;
}

export interface EKReminder extends ObjCObject {
  calendarItemIdentifier: NSString;
  get title(): NSString;
  set title(value: string);
  calendar: EKCalendar;
  get notes(): NSString;
  set notes(value: string);
  dueDateComponents: NSDateComponents;
  addAlarm(alarm: EKAlarm): void;
  addRecurrenceRule(rule: EKRecurrenceRule): void;
}

/** The full-access requests exist from macOS 14 on. */
export interface EKEventStore extends ObjCObject {
  defaultCalendarForNewEvents: EKCalendar;
  defaultCalendarForNewReminders: EKCalendar;
  requestFullAccessToEventsWithCompletion?(complete: () => void): void;
  requestFullAccessToRemindersWithCompletion?(complete: () => void): void;
  requestAccessToEntityTypeCompletion(type: ObjCInteger, complete: () => void): void;
  calendarsForEntityType(type: ObjCInteger): NSArray<EKCalendar>;
  predicateForEventsWithStartDateEndDateCalendars(
    start: NSDate,
    end: NSDate,
    calendars: NSArray<EKCalendar>,
  ): NSPredicate;
  eventsMatchingPredicate(predicate: NSPredicate): NSArray<EKEvent>;
  predicateForIncompleteRemindersWithDueDateStartingEndingCalendars(
    start: NSDate,
    end: NSDate,
    calendars: NSArray<EKCalendar>,
  ): NSPredicate;
  fetchRemindersMatchingPredicateCompletion(
    predicate: NSPredicate,
    complete: (reminders: NSArray<EKReminder>) => void,
  ): void;
  saveEventSpanCommitError(event: EKEvent, span: ObjCInteger, commit: boolean, error: ObjCRef<NSError>): boolean;
  saveReminderCommitError(reminder: EKReminder, commit: boolean, error: ObjCRef<NSError>): boolean;
}

/** Called bare, `$()` makes nil, which ObjC takes in place of any object; called with an array, it makes an NSArray. */
export interface ObjCBridge {
  <T extends ObjCObject>(): T;
  <T>(items: T[]): NSArray<T>;
  EKAlarm: { alarmWithRelativeOffset(seconds: number): EKAlarm; alarmWithAbsoluteDate(date: NSDate): EKAlarm };
  EKEntityTypeEvent: ObjCInteger;
  EKEntityTypeReminder: ObjCInteger;
  EKEvent: { eventWithEventStore(store: EKEventStore): EKEvent };
  EKEventStore: {
    alloc: { init: EKEventStore };
    authorizationStatusForEntityType(type: ObjCInteger): ObjCInteger;
  };
  EKRecurrenceDayOfWeek: { dayOfWeek(day: number): EKRecurrenceDayOfWeek };
  EKRecurrenceEnd: {
    recurrenceEndWithOccurrenceCount(count: number): EKRecurrenceEnd;
    recurrenceEndWithEndDate(date: NSDate): EKRecurrenceEnd;
  };
  EKRecurrenceFrequencyDaily: ObjCInteger;
  EKRecurrenceFrequencyMonthly: ObjCInteger;
  EKRecurrenceFrequencyWeekly: ObjCInteger;
  EKRecurrenceFrequencyYearly: ObjCInteger;
  EKRecurrenceRule: {
    alloc: {
      initRecurrenceWithFrequencyIntervalDaysOfTheWeekDaysOfTheMonthMonthsOfTheYearWeeksOfTheYearDaysOfTheYearSetPositionsEnd(
        frequency: ObjCInteger,
        interval: number,
        daysOfTheWeek: NSArray<EKRecurrenceDayOfWeek>,
        daysOfTheMonth: NSArray<ObjCObject>,
        monthsOfTheYear: NSArray<ObjCObject>,
        weeksOfTheYear: NSArray<ObjCObject>,
        daysOfTheYear: NSArray<ObjCObject>,
        setPositions: NSArray<ObjCObject>,
        end: EKRecurrenceEnd,
      ): EKRecurrenceRule;
    };
  };
  EKReminder: { reminderWithEventStore(store: EKEventStore): EKReminder };
  EKSpanThisEvent: ObjCInteger;
  NSCalendar: { currentCalendar: NSCalendar };
  NSCalendarUnitDay: ObjCInteger;
  NSDate: {
    date: NSDate;
    dateWithTimeIntervalSinceNow(seconds: number): NSDate;
    dateWithTimeIntervalSince1970(seconds: number): NSDate;
  };
  NSDateComponentUndefined: ObjCInteger;
  NSDateComponents: { alloc: { init: NSDateComponents } };
  NSDateFormatter: { alloc: { init: NSDateFormatter } };
  NSDateFormatterNoStyle: ObjCInteger;
  NSDateFormatterShortStyle: ObjCInteger;
  NSMutableArray: { array: NSMutableArray<never> };
  NSRunLoop: { currentRunLoop: { runUntilDate(date: NSDate): void } };
  NSTimeZone: { systemTimeZone: NSTimeZone; timeZoneWithName(name: string): NSTimeZone };
  NSURL: { URLWithString(text: string): NSURL };
}

export interface ObjCGlobal {
  import(framework: 'EventKit' | 'Foundation'): void;
  unwrap<T>(value: ObjCValue<T>): T;
}
