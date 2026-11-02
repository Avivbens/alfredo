import type { AlfredListItem } from 'fast-alfred';
import type { PrAction } from '../models/launch-action.schema';
import type { LauncherIssue } from '../models/launcher-issue.schema';
import type { PrState } from './pr-match.service';

/** The typings omit `shift`, which Alfred accepts. */
type ItemMods = NonNullable<AlfredListItem['mods']> & { shift?: { arg: string; subtitle: string } };

function toHomeRelative(path: string, home: string): string {
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

function toIssueItem(issue: LauncherIssue, home: string): AlfredListItem {
  switch (issue.kind) {
    case 'gh-missing': {
      return { title: 'Install the GitHub CLI (gh)', subtitle: 'brew install gh', valid: false };
    }
    case 'gh-unauthenticated': {
      return { title: 'Run gh auth login', subtitle: 'Then reopen this list', valid: false };
    }
    case 'failed': {
      return { title: 'Could not load pull requests', subtitle: issue.reason, valid: false };
    }
    case 'no-clones': {
      const roots = issue.roots.map((root) => toHomeRelative(root, home)).join(', ');

      return {
        title: `No git repos found under ${roots}`,
        subtitle: `Add folders to Repo folders, or raise Scan depth (now ${issue.depth})`,
        valid: false,
      };
    }
  }
}

function toArg(pr: PrAction['pr'], mode: PrAction['mode']): string {
  const action: PrAction = { kind: 'pr', pr, mode };

  return JSON.stringify(action);
}

function toLocation({ clone, worktree }: PrState, home: string): string {
  if (!clone) {
    return 'no local clone';
  }

  if (!worktree) {
    return 'no worktree';
  }

  return toHomeRelative(worktree.path, home);
}

function toMods({ pr, clone }: PrState, shift: NonNullable<ItemMods['shift']>): ItemMods {
  if (!clone) {
    return { shift };
  }

  const newSession = toArg(pr, 'new-session');
  const resumeSession = toArg(pr, 'resume-session');

  return {
    cmd: { arg: newSession, subtitle: 'Start a new agent session' },
    alt: { arg: resumeSession, subtitle: 'Resume the last agent session' },
    shift,
  };
}

function toPrItem(state: PrState, home: string): AlfredListItem {
  const { pr, clone } = state;
  const prefix = `${pr.source === 'review' ? 'Review · ' : ''}${pr.isDraft ? 'Draft · ' : ''}`;
  const subtitle = `${prefix}${pr.nameWithOwner} #${pr.number} · ${toLocation(state, home)}`;
  const shift = { arg: toArg(pr, 'browser'), subtitle: 'Open the pull request in the browser' };
  const mods = toMods(state, shift);

  return { title: pr.title, subtitle, arg: toArg(pr, clone ? 'editor' : 'browser'), mods, uid: pr.url };
}

export function toPrItems(states: PrState[], issues: LauncherIssue[], home: string): AlfredListItem[] {
  const issueItems = issues.map((issue) => toIssueItem(issue, home));
  const prItems = states.map((state) => toPrItem(state, home));

  return [...issueItems, ...prItems];
}
