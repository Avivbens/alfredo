import type { AlfredListItem } from 'fast-alfred';
import { toHomeRelative } from '../../common/home-path.util';
import { toTaskBranch } from '../../common/task-branch.util';
import type { Clone } from '../../models/clone.schema';
import type { TaskAction } from '../../models/launch-action.schema';
import type { AppRouter } from '../../models/routes.model';

const ROUTE_MARKER = /^\s*›\s*/;

function toArg(branch: string, clone: Clone, mode: TaskAction['mode']): string {
  const action: TaskAction = { kind: 'task', branch, clone, mode };

  return JSON.stringify(action);
}

/** Backspacing into an open route's label can leave its marker in the input, which is not part of the name. */
export function toTaskItems(input: string, router: AppRouter, keyword: string): AlfredListItem[] {
  const taskName = input.replace(ROUTE_MARKER, '');
  const branch = toTaskBranch(taskName);
  if (!branch) {
    return [{ title: 'Type a task name', subtitle: `For example: ${keyword} Agenda view`, valid: false }];
  }

  const pickRepo = router.link('pick-repo', {
    label: branch,
    state: { branch },
    title: `New task: ${branch}`,
    subtitle: '↩ choose a repo',
  });

  return [pickRepo];
}

export function toRepoItems(clones: Clone[], branch: string, home: string, filter: string): AlfredListItem[] {
  if (!clones.length) {
    return [{ title: `No repo matches "${filter}"`, subtitle: 'Change the filter to see more repos', valid: false }];
  }

  return clones.map((clone) => {
    const subtitle = toHomeRelative(clone.path, home);
    const arg = toArg(branch, clone, 'editor');
    const newSession = toArg(branch, clone, 'new-session');

    return {
      title: clone.nameWithOwner,
      subtitle,
      arg,
      mods: { cmd: { arg: newSession, subtitle: 'Start a new agent session' } },
      uid: clone.path,
    };
  });
}
