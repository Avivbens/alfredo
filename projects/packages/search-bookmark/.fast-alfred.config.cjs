const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Search Bookmark! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Search browser bookmarks via the keyword 'bm'. Once you select a bookmark, it will be opened in the dedicated browser.

Incognito mode will be opened with the dedicated browser as well.

## Usage

1. Open Alfred and type 'bm' followed by a space
1. Type the name of the bookmark you want to search for (e.g., 'bm google')
1. The list of bookmarks will be displayed along with the corresponding bookmark directories structure
1. Select the bookmark from the list of results
1. Press Enter to open the bookmark in the dedicated browser
1. To open the bookmark in incognito mode, press Command + Enter

## Copy open tabs

Copy your open Chrome tabs as Markdown links via the keyword 'tabs'. You can change the keyword in the workflow configuration.

1. Open Alfred and type 'tabs' followed by a space
1. Press Enter on 'Copy current tab' to copy the active tab of the front window as a link
1. Press Enter on 'Copy this window' to copy the tabs of the window in front
1. Press Enter on 'Copy all windows' to copy every window, grouped under a heading per window
1. Press Enter on 'Copy another window' to copy any other window, shown with its active tab's title
1. Type a word to search your open tabs, and press Enter to copy the tab as a link
1. To switch to a searched tab, press Command + Enter

Incognito windows are skipped. The first time you run it, macOS asks to let Alfred control Google Chrome.

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
