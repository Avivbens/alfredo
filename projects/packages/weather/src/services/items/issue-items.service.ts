import type { AlfredListItem, FastAlfred } from 'fast-alfred';
import type { WeatherIssue } from '../../models/weather-issue.schema';

export type Icons = FastAlfred['icons'];

export function toIssueItem(issue: WeatherIssue, icons: Icons): AlfredListItem {
  switch (issue.kind) {
    case 'no-places':
      return {
        title: 'No places to show',
        subtitle: 'Add places in the workflow configuration, or turn on the current location',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'location-unavailable':
      return {
        title: "📍 Couldn't detect your location",
        subtitle: 'The IP lookup failed - your saved places still work',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'place-not-found':
      return {
        title: `No place named "${issue.name}"`,
        subtitle: 'Fix it in the workflow configuration, or write it as Label: lat, lon',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'no-hours':
      return {
        title: 'No hourly forecast for this day',
        subtitle: `Open-Meteo has no hours for ${issue.name} on this day yet`,
        valid: false,
        icon: { path: icons.getIcon('info') },
      };

    case 'search-failed':
      return {
        title: '⚠️ City search failed',
        subtitle: issue.message,
        valid: false,
        text: { copy: issue.message, largetype: issue.message },
        icon: { path: icons.getIcon('error') },
      };

    case 'request-failed':
      return {
        title: `⚠️ ${issue.name}: couldn't load the weather`,
        subtitle: `${issue.message} · retrying`,
        valid: false,
        text: { copy: issue.message, largetype: issue.message },
        icon: { path: icons.getIcon('error') },
      };
  }
}
