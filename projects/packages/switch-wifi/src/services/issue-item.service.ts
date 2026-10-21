import type { AlfredListItem, FastAlfred } from 'fast-alfred';
import { encodeAction } from '../models/network-action.schema';
import type { NetworkIssue } from '../models/network-issue.schema';

type Icons = FastAlfred['icons'];

export function toIssueItem(issue: NetworkIssue, icons: Icons): AlfredListItem {
  switch (issue.kind) {
    case 'no-wifi-interface':
      return {
        title: '⚠️ This Mac has no Wi-Fi interface',
        subtitle: 'networksetup lists no Wi-Fi hardware port',
        valid: false,
        icon: { path: icons.getIcon('error') },
      };

    case 'wifi-off':
      return {
        title: 'Wi-Fi is off',
        subtitle: '↩ to turn Wi-Fi on',
        arg: encodeAction({ kind: 'power-on', device: issue.device }),
        icon: { path: icons.getIcon('warning') },
      };

    case 'no-saved-networks':
      return {
        title: 'No saved Wi-Fi networks found',
        subtitle: 'Join a network from the menu bar once and it shows up here',
        valid: false,
        icon: { path: icons.getIcon('warning') },
      };

    case 'networksetup-failed':
      return {
        title: '⚠️ networksetup failed',
        subtitle: issue.message,
        valid: false,
        text: { copy: issue.message, largetype: issue.message },
        icon: { path: icons.getIcon('error') },
      };
  }
}
