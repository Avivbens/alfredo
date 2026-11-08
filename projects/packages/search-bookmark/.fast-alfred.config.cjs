const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Search Bookmark! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Search bookmarks

1. Type 'bm' in Alfred, then part of a bookmark's name
2. Press Enter to open it in its Chrome profile, or Command + Enter to open it in incognito

## Copy open tabs

1. Type 'tabs' in Alfred
2. Press Enter on a row to copy the selected tabs, the current tab, a window or all windows as Markdown links
3. Or type a word to find a tab: Enter copies it, Command + Enter switches to it

To copy only some tabs, Command or Shift-click them in Chrome first. That row needs Alfred under Accessibility in System Settings.

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
    name: 'Search Bookmarks',
    category: 'Internet',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
