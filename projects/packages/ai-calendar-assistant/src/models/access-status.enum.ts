import { z } from 'zod';

export enum AccessStatus {
  NotDetermined = 0,
  Restricted = 1,
  Denied = 2,
  FullAccess = 3,
  WriteOnly = 4,
}

export const accessStatusSchema = z.enum(AccessStatus);

export enum CalendarEntity {
  Event = 'event',
  Reminder = 'reminder',
}

export enum AccessRoute {
  EventKit = 'eventkit',
  Request = 'request',
  Settings = 'settings',
}
