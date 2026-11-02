import { describe, expect, it } from 'vitest';
import { ACCESS_JXA } from './access.jxa';

describe('access.jxa', () => {
  describe('ACCESS_JXA', () => {
    it('should reach nothing outside the handler, since osascript runs it from its source alone', () => {
      expect(ACCESS_JXA).not.toMatch(/__name\(|__vi_|__vite_ssr|\brequire\(|(?<!ObjC\.)\bimport\b/);
    });
  });
});
