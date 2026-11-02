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

export interface NSArray<T> extends ObjCObject {
  count: ObjCInteger;
  objectAtIndex(index: number): T;
}

export interface NSMutableArray<T> extends NSArray<T> {
  addObject(item: T): void;
}

export interface NSDateComponents extends ObjCObject {
  hour: ObjCInteger;
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
}

export interface EKEvent extends ObjCObject {
  eventIdentifier: NSString;
  title: NSString;
  calendar: EKCalendar;
  location: NSString;
  allDay: boolean;
  startDate: NSDate;
  endDate: NSDate;
}

export interface EKReminder extends ObjCObject {
  calendarItemIdentifier: NSString;
  title: NSString;
  calendar: EKCalendar;
  dueDateComponents: NSDateComponents;
}

/** The full-access requests exist from macOS 14 on. */
export interface EKEventStore extends ObjCObject {
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
}

/** Called bare, `$()` makes nil, which ObjC takes in place of any object. */
export interface ObjCBridge {
  <T extends ObjCObject>(): T;
  EKEntityTypeEvent: ObjCInteger;
  EKEntityTypeReminder: ObjCInteger;
  EKEventStore: {
    alloc: { init: EKEventStore };
    authorizationStatusForEntityType(type: ObjCInteger): ObjCInteger;
  };
  NSCalendar: { currentCalendar: NSCalendar };
  NSCalendarUnitDay: ObjCInteger;
  NSDate: { date: NSDate; dateWithTimeIntervalSinceNow(seconds: number): NSDate };
  NSDateComponentUndefined: ObjCInteger;
  NSDateFormatter: { alloc: { init: NSDateFormatter } };
  NSDateFormatterNoStyle: ObjCInteger;
  NSDateFormatterShortStyle: ObjCInteger;
  NSMutableArray: { array: NSMutableArray<never> };
  NSRunLoop: { currentRunLoop: { runUntilDate(date: NSDate): void } };
}

export interface ObjCGlobal {
  import(framework: 'EventKit' | 'Foundation'): void;
  unwrap<T>(value: ObjCValue<T>): T;
}
