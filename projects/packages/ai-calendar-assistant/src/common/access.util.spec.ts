import { describe, expect, it } from 'vitest';
import { AccessRoute, AccessStatus } from '../models/access-status.enum';
import { toAccessRoute } from './access.util';

describe('access.util', () => {
  describe('toAccessRoute', () => {
    it('should route full access to eventkit', () => {
      expect(toAccessRoute(AccessStatus.FullAccess)).toBe(AccessRoute.EventKit);
    });

    it('should route an undetermined status to a request', () => {
      expect(toAccessRoute(AccessStatus.NotDetermined)).toBe(AccessRoute.Request);
    });

    it.each([AccessStatus.Restricted, AccessStatus.Denied, AccessStatus.WriteOnly])(
      'should route status %s to settings',
      (status) => {
        expect(toAccessRoute(status)).toBe(AccessRoute.Settings);
      },
    );
  });
});
