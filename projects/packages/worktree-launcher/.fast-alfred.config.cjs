const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Worktree Launcher! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

List your open pull requests and review requests via the keyword 'wt'. Pressing Enter opens the pull request's git worktree in your editor, creating it first if it does not exist yet.

You can also start an agent session in the worktree, or paste a pull request URL to open that one.

## Usage

1. Open Alfred and type 'wt' followed by a space
1. Type part of a title, repo or number to filter, or paste a pull request URL (e.g., 'wt https://github.com/owner/repo/pull/123')
1. Press Enter to open the worktree in your editor, creating it if needed
1. Press Command + Enter to start a new agent session in the worktree
1. Press Option + Enter to resume the last agent session in the worktree
1. Press Shift + Enter to open the pull request in the browser

When the editor setting is VS Code, Command + Enter and Option + Enter open the session in the agent chat in VS Code: a new chat, or the folder's latest session. With Cursor, they open the session in your selected terminal app with the agent command.

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
