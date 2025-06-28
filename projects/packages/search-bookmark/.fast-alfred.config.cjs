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
