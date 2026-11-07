import { describe, expect, it } from 'vitest';
import { toIssueItem } from './issue-items.service';
import { ICONS } from './items.mock';

describe('issue-items.service', () => {
  describe('toIssueItem', () => {
    it('should point to the settings when there is nothing to show', () => {
      expect(toIssueItem({ kind: 'no-places' }, ICONS)).toEqual({
        title: 'No places to show',
        subtitle: 'Add places in the workflow configuration, or turn on the current location',
        valid: false,
        icon: { path: 'warning.png' },
      });
    });

    it('should say the location is unknown and the saved places still work', () => {
      expect(toIssueItem({ kind: 'location-unavailable' }, ICONS)).toEqual({
        title: "📍 Couldn't detect your location",
        subtitle: 'The IP lookup failed - your saved places still work',
        valid: false,
        icon: { path: 'warning.png' },
      });
    });

    it('should name a saved place that was not found', () => {
      expect(toIssueItem({ kind: 'place-not-found', name: 'Nowhere' }, ICONS)).toEqual({
        title: 'No place named "Nowhere"',
        subtitle: 'Fix it in the workflow configuration, or write it as Label: lat, lon',
        valid: false,
        icon: { path: 'warning.png' },
      });
    });

    it('should say a day has no hourly forecast', () => {
      expect(toIssueItem({ kind: 'no-hours', name: 'Tel Aviv' }, ICONS)).toEqual({
        title: 'No hourly forecast for this day',
        subtitle: 'Open-Meteo has no hours for Tel Aviv on this day yet',
        valid: false,
        icon: { path: 'info.png' },
      });
    });

    it('should show a failed city search with its reason', () => {
      expect(toIssueItem({ kind: 'search-failed', message: 'fetch failed' }, ICONS)).toEqual({
        title: '⚠️ City search failed',
        subtitle: 'fetch failed',
        valid: false,
        text: { copy: 'fetch failed', largetype: 'fetch failed' },
        icon: { path: 'error.png' },
      });
    });

    it('should show a failed request with its reason', () => {
      const issue = { kind: 'request-failed', name: 'Haifa', message: 'fetch failed' } as const;

      expect(toIssueItem(issue, ICONS)).toEqual({
        title: "⚠️ Haifa: couldn't load the weather",
        subtitle: 'fetch failed · retrying',
        valid: false,
        text: { copy: 'fetch failed', largetype: 'fetch failed' },
        icon: { path: 'error.png' },
      });
    });
  });
});
