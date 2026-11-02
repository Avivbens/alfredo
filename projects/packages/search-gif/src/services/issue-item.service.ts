import type { AlfredListItem, FastAlfred } from 'fast-alfred';
import type { GifIssue } from '../models/gif-issue.schema';

type Icons = FastAlfred['icons'];

export function toIssueItem(issue: GifIssue, icons: Icons): AlfredListItem {
  switch (issue.kind) {
    case 'empty-query':
      return {
        title: 'Search GIPHY',
        subtitle: 'Type what the GIF should show · Powered By GIPHY',
        valid: false,
      };

    case 'missing-api-key':
      return {
        title: '⚠️ No GIPHY API key',
        subtitle: 'Create one at developers.giphy.com and add it in the workflow configuration',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'no-results':
      return {
        title: `No GIFs found for "${issue.query}"`,
        subtitle: 'Try other words · Powered By GIPHY',
        valid: false,
        icon: { path: icons.getIcon('info') },
      };

    case 'invalid-api-key':
      return {
        title: '⚠️ GIPHY rejected the API key',
        subtitle: 'Check the key in the workflow configuration',
        valid: false,
        icon: { path: icons.getIcon('error') },
      };

    case 'rate-limited':
      return {
        title: '⚠️ GIPHY rate limit reached',
        subtitle: 'Beta keys allow 100 GIPHY calls an hour - try again later',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'request-failed':
      return {
        title: '⚠️ GIPHY search failed',
        subtitle: issue.message,
        valid: false,
        text: { copy: issue.message, largetype: issue.message },
        icon: { path: icons.getIcon('error') },
      };
  }
}
