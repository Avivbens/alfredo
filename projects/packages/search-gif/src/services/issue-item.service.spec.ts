import type { FastAlfred } from 'fast-alfred';
import { describe, expect, it } from 'vitest';
import type { GifIssue } from '../models/gif-issue.schema';
import { toIssueItem } from './issue-item.service';

const icons = { getIcon: (name: string) => `${name}.png` } as unknown as FastAlfred['icons'];

describe('issue-item.service', () => {
  describe('toIssueItem', () => {
    it('should show the failure message without offering an action', () => {
      const message = 'getaddrinfo ENOTFOUND api.giphy.com';

      expect(toIssueItem({ kind: 'request-failed', message }, icons)).toMatchObject({
        subtitle: message,
        valid: false,
        text: { copy: message, largetype: message },
      });
    });

    it('should name the query that found nothing', () => {
      expect(toIssueItem({ kind: 'no-results', query: 'hope' }, icons).title).toBe('No GIFs found for "hope"');
    });

    it.each<GifIssue>([
      { kind: 'empty-query' },
      { kind: 'missing-api-key' },
      { kind: 'no-results', query: 'hope' },
      { kind: 'invalid-api-key' },
      { kind: 'rate-limited' },
      { kind: 'request-failed', message: 'boom' },
    ])('should not offer an action for $kind', (issue) => {
      expect(toIssueItem(issue, icons).valid).toBe(false);
    });
  });
});
