import { describe, expect, it } from 'vitest';
import { chromeTabsResultSchema } from './chrome-tabs.schema';

describe('chrome-tabs.schema', () => {
  describe('chromeTabsResultSchema', () => {
    it('should coerce numeric ids that JXA returns as strings', () => {
      expect(
        chromeTabsResultSchema.parse({ running: true, windows: [{ id: '12', activeTabIndex: '2', tabs: [] }] }),
      ).toEqual({ running: true, windows: [{ id: 12, activeTabIndex: 2, tabs: [] }] });
    });
  });
});
