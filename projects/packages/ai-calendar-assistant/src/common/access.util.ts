import { AccessRoute, AccessStatus } from '../models/access-status.enum';

export function toAccessRoute(status: AccessStatus): AccessRoute {
  if (status === AccessStatus.FullAccess) {
    return AccessRoute.EventKit;
  }

  if (status === AccessStatus.NotDetermined) {
    return AccessRoute.Request;
  }

  return AccessRoute.Settings;
}
