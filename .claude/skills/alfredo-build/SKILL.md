---
name: alfredo-build
description: Use when a workflow in this repo (an Nx package under projects/packages, here or in a ../alfredo@<name> worktree) has to be built - imported into Alfred for the user to try, or built only to inspect the bundle.
---

# Build an Alfredo workflow for Alfred

```bash
.claude/skills/alfredo-build/scripts/build-import.sh <worktree> <package>
```

The script backs up `info.plist`, builds with the worktree's Nx root pinned, restores the plist byte for byte (a build strips fast-alfred's updater objects, and the plist may hold uncommitted edits), opens the `.alfredworkflow` for import, and prints the worktree, branch and commit it came from.

Tell the user to pick **replace** in Alfred's dialog, and say which worktree and branch the build is from: every import replaces the single installed copy, so builds from parallel worktrees overwrite each other.

## Build with the local updates

The build takes the worktree's files as they are: uncommitted edits are in, and the `@alfredo/*` libs resolve to this worktree's `src`. Never stash, check out or switch to a clean copy before building. After the build, prove the newest edit made it into the packed workflow:

```bash
unzip -p dist/<package>/esbuild/<package>.alfredworkflow esbuild/<entry>.js | grep -n '<a line from the edit>'
```

## Common mistakes

- **Building with `nx` from the main checkout's root while working in a worktree.** Nx resolves the pinned workspace root, not the worktree; the script sets `NX_WORKSPACE_ROOT_PATH`.
- **`git checkout -- info.plist` after a build when the plist has uncommitted changes.** That throws the changes away; the script restores from its own backup instead.
- **Running `nx build` directly, even only to inspect the bundle.** It strips the plist all the same. Use the script, or copy the plist aside first and back after, as the script does.
- **Importing a build from a throwaway worktree or fresh checkout.** It holds only committed code. Fresh-install checks run there; imports come from the worktree being worked in.
