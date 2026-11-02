import type { AlfredListItem, AlfredScriptFilter } from 'fast-alfred';
import { toHomeRelative } from '../common/home-path.util';
import type { PrAction, StackAction } from '../models/launch-action.schema';
import type { LauncherIssue } from '../models/launcher-issue.schema';
import type { PullRequest } from '../models/pull-request.schema';
import type { ListEntry, OpenLayers, StackGroup, StackedPullRequest } from './pr-list.service';
import { findOpenLayers } from './pr-list.service';
import type { PrState } from './pr-match.service';

/** The typings omit `shift`, which Alfred accepts. */
type ItemMods = NonNullable<AlfredListItem['mods']> & { shift?: { arg: string; subtitle: string } };

const SOURCE_PREFIX: Partial<Record<PrState['pr']['source'], string>> = {
  review: 'Review · ',
  assigned: 'Assigned · ',
};

const TREE_GLYPHS = { header: '┌ ', member: '│ ', last: '└ ' } as const;

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

function toStackArg(
  group: StackGroup,
  layers: StackedPullRequest[],
  mode: StackAction['mode'],
  target: number,
): string {
  const action: StackAction = {
    kind: 'stack',
    nameWithOwner: group.nameWithOwner,
    number: group.number,
    layers: layers.map(({ number, headRefName, url, stack }) => ({
      number,
      headRefName,
      url,
      position: stack.position,
    })),
    target,
    mode,
  };

  return JSON.stringify(action);
}

/** With no clone there is nothing to open locally, so ↩ falls back to the browser and the session keys are left off. */
function toKeys(
  shift: NonNullable<ItemMods['shift']>,
  toLocalArg?: (mode: Exclude<PrAction['mode'], 'browser'>) => string,
): { arg: string; mods: ItemMods } {
  if (!toLocalArg) {
    return { arg: shift.arg, mods: { shift } };
  }

  const arg = toLocalArg('editor');
  const newSession = toLocalArg('new-session');
  const resumeSession = toLocalArg('resume-session');

  return {
    arg,
    mods: {
      cmd: { arg: newSession, subtitle: 'Start a new agent session' },
      alt: { arg: resumeSession, subtitle: 'Resume the last agent session' },
      shift,
    },
  };
}

function toPrefix({ source, isDraft }: PullRequest): string {
  return `${SOURCE_PREFIX[source] ?? ''}${isDraft ? 'Draft · ' : ''}`;
}

function toLocation({ clone, worktree }: Pick<PrState, 'clone' | 'worktree'>, home: string): string {
  if (!clone) {
    return 'no local clone';
  }

  if (!worktree) {
    return 'no worktree';
  }

  return toHomeRelative(worktree.path, home);
}

function toPrItem(state: PrState, home: string): AlfredListItem {
  const { pr, clone } = state;
  const subtitle = `${toPrefix(pr)}${pr.nameWithOwner} #${pr.number} · ${toLocation(state, home)}`;
  const shift = { arg: toArg(pr, 'browser'), subtitle: 'Open the pull request in the browser' };

  const keys = toKeys(shift, clone ? (mode) => toArg(pr, mode) : undefined);

  return { title: pr.title, subtitle, ...keys, uid: pr.url };
}

function toHeaderItem(
  { number, nameWithOwner, clone, folder }: StackGroup,
  layers: StackedPullRequest[],
  home: string,
): AlfredListItem {
  const slash = nameWithOwner.indexOf('/');
  const repo = nameWithOwner.slice(slash + 1);
  const subtitle = toLocation({ clone, worktree: folder }, home);

  return { title: `${TREE_GLYPHS.header}Stack ${number} · ${repo} · ${layers.length} PRs`, subtitle, valid: false };
}

/** The folder holds one branch at a time, so each layer row says which layer it is on when that is another one. */
function toLayerLocation(
  pr: StackedPullRequest,
  group: StackGroup,
  layers: StackedPullRequest[],
  home: string,
): string {
  const location = toLocation({ clone: group.clone, worktree: group.folder }, home);
  const branch = group.folder?.branch;
  if (!branch || branch === pr.headRefName) {
    return location;
  }
  const layer = layers.find(({ headRefName }) => headRefName === branch);

  return `${location} (on ${layer ? `${layer.stack.position}/${group.size}` : branch})`;
}

/** The group holds only the layers typing left, so the last of them closes the stack's tree. */
function toLayerGlyph(state: StackGroup['layers'][number], group: StackGroup): string {
  return state === group.layers.at(-1) ? TREE_GLYPHS.last : TREE_GLYPHS.member;
}

function toLayerItem(
  state: StackGroup['layers'][number],
  group: StackGroup,
  layers: StackedPullRequest[],
  home: string,
): AlfredListItem {
  const { pr } = state;
  const { position } = pr.stack;
  const below = layers.find(({ stack }) => stack.position === position - 1);
  const on = below ? ` · on #${below.number}` : '';
  const subtitle = `${toPrefix(pr)}${pr.nameWithOwner} #${pr.number}${on} · ${toLayerLocation(pr, group, layers, home)}`;
  const shift = { arg: toArg(pr, 'browser'), subtitle: 'Open the pull request in the browser' };

  const glyph = toLayerGlyph(state, group);
  const keys = toKeys(shift, group.clone ? (mode) => toStackArg(group, layers, mode, pr.number) : undefined);

  return { title: `${glyph}${position}/${group.size} · ${pr.title}`, subtitle, ...keys, uid: pr.url };
}

function toStackItems(group: StackGroup, layers: StackedPullRequest[], home: string): AlfredListItem[] {
  const header = toHeaderItem(group, layers, home);
  const layerItems = group.layers.map((state) => toLayerItem(state, group, layers, home));

  return [header, ...layerItems];
}

function toEntryItems(entry: ListEntry, home: string, openLayers: OpenLayers): AlfredListItem[] {
  switch (entry.kind) {
    case 'pr': {
      const item = toPrItem(entry.state, home);

      return [item];
    }
    case 'stack': {
      const open = findOpenLayers(openLayers, entry.group);

      return toStackItems(entry.group, open, home);
    }
  }
}

export function toListItems(
  entries: ListEntry[],
  issues: LauncherIssue[],
  home: string,
  openLayers: OpenLayers = new Map(),
): AlfredListItem[] {
  const issueItems = issues.map((issue) => toIssueItem(issue, home));
  const entryItems = entries.flatMap((entry) => toEntryItems(entry, home, openLayers));

  return [...issueItems, ...entryItems];
}

/** Alfred re-sorts rows that carry a uid by its usage knowledge, which would split a stack's rows apart. */
export function toPrListOutput(items: AlfredListItem[]): AlfredScriptFilter {
  return { items, skipknowledge: true };
}
