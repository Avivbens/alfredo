const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Encrypt Files! ✨

## Features

Pack the files and folders you select into one zip, encrypted with AES-256 behind a password.

## Usage

Select files or folders in Finder, open Alfred's action menu and choose \`Encrypt with Password\`.
Type the password twice, and the zip appears next to the first selected item.

The names of the files inside the zip stay readable without the password - only their contents are encrypted.
To open it, use any unzip app with AES support, such as Keka, The Unarchiver or 7-Zip.

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
  workflowMetadata: {
    name: 'Encrypt Files',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
