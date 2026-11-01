const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Search Gif! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Search GIPHY for GIFs right from Alfred, with a thumbnail next to every result.

- ⇧ plays the GIF large in Quick Look
- ↩ copies the GIF itself, ready to paste into Slack, Messages or Finder
- Alfred stays open after a copy, so you can copy another one

## Usage

\`gif <query>\` - Search GIPHY, e.g. \`gif hope\`

The keyword is configurable in the workflow settings.

## Setup

The workflow searches with your own GIPHY API key:
1. Create an app at https://developers.giphy.com/dashboard and copy its API key.
1. Paste the key in the workflow configuration.

A new key starts as a beta key, which allows 100 GIPHY calls an hour - each pause while you type spends one.

Powered By GIPHY.

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
    name: 'Search Gif',
    category: 'Productivity',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
