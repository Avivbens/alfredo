const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Worktree Launcher! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

List your open pull requests, review requests and pull requests assigned to you via the keyword 'wt'; typing matches the title, repo, number or branch. Pressing Enter opens the pull request's git worktree in your editor, creating it first if it does not exist yet.

You can also start an agent session in the worktree, or paste a pull request URL to open that one.

Pull requests of one GitHub stack show together, bottom to top, under a header row '┌ Stack <n> · <repo> · <k> PRs'. Each layer reads '│ <position>/<size> · <title>', and the last layer shown starts with '└ ' instead, so the group reads as one tree while you type. A layer's subtitle adds ' · on #<n>' for the layer below, and the location shows '(on <p>/<size>)' when the stack's folder is on another layer. A local 'gh stack' whose top layer is not pushed yet still counts. If GitHub rejects the stack fields, the list falls back to plain pull requests.

A stack lives in one folder, '<repo>@stack-<n>', and Enter on a layer opens it. If the folder is on another layer and has no uncommitted changes (untracked files don't count), it switches to that layer first. With uncommitted changes, or in the middle of a rebase, it opens the folder unchanged and a notification says why. With no folder yet, it creates one and fetches every open layer.

The header only labels the group and shows the stack's folder. On a layer, Command + Enter and Option + Enter start or resume a session as usual, and Shift + Enter opens the pull request. Stacks from forks keep one worktree per pull request.

Start a new task with the keyword 'wtn' followed by a task name: pick a repo and the workflow creates a branch from the freshly fetched default branch in its own worktree, then opens it.

## Usage

1. Open Alfred and type 'wt' followed by a space
1. Type part of a title, repo, number or branch to filter, or paste a pull request URL (e.g., 'wt https://github.com/owner/repo/pull/123')
1. Press Enter to open the worktree in your editor, creating it if needed
1. Press Command + Enter to start a new agent session in the worktree
1. Press Option + Enter to resume the last agent session in the worktree
1. Press Shift + Enter to open the pull request in the browser
1. To start a new task, type 'wtn' followed by a task name (e.g., 'wtn Agenda view'), press Enter, then pick a repo

When the editor setting is VS Code, Command + Enter and Option + Enter open the session in the agent chat in VS Code: a new chat, or the folder's latest session. With Cursor, they open the session in your selected terminal app with the agent command.

For a new task, Enter opens the new worktree in your editor and Command + Enter starts an agent session in it.

The GitHub CLI (gh) is required, and you need to be logged in with 'gh auth login'.

To view the workflow codebase, click here:
${homepage}
`.trim();

/**
 * @type {import('fast-alfred').FastAlfredConfig}
 */
module.exports = {
  bundlerOptions: {
    targetDir: resolve(__dirname, '../../../', 'dist', env.NX_TASK_TARGET_PROJECT, 'esbuild'),
  },
  updates: {
    bundleHelpers: true,
    userConfiguration: {
      checkUpdatesCheckbox: true,
    },
  },
  workflowMetadata: {
    name: 'Worktree Launcher',
    category: 'Productivity',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
