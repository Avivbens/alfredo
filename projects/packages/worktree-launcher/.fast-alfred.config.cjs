const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Worktree Launcher! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- Lists your open pull requests, review requests and pull requests assigned to you
- Opens a pull request's git worktree in your editor, creating it first if needed
- Starts or resumes an agent session in the worktree
- Groups the pull requests of a GitHub stack and opens them in one folder
- Starts a new task on a fresh branch in its own worktree

## Usage

1. Type \`wt\` in Alfred, then part of a title, repo, number or branch, or paste a pull request URL
1. Press Enter to open the worktree in your editor
1. Press \`⌘\` Enter to start an agent session, or \`⌥\` Enter to resume the last one
1. Press \`⇧\` Enter to open the pull request in the browser

To start a new task, type \`wtn\` followed by a task name, press Enter and pick a repo.

Requires the GitHub CLI (\`gh\`), logged in with \`gh auth login\`.

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
