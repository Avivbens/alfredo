const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Advance Fs Search! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Description

Search over your file system with [Alfred](https://www.alfredapp.com/).

## Features 🥷

- Support VSCode as an editor
- Supported terminals:
  - iTerm2
  - Warp
  - Terminal.app

## Usage

1. Configure your search settings over the workflow settings.
1. Use the keywords you've configured to open the results via VSCode / your selected Terminal ✨


To view the workflow codebase, click here:
${homepage}
`.trim();

/**
 * @type {import('fast-alfred').FastAlfredConfig}
 */
module.exports = {
  bundlerOptions: {
    outputFormat: 'esm',
    esmHelpers: true,
    targetDir: resolve(__dirname, '../../../', 'dist', env.NX_TASK_TARGET_PROJECT, 'esbuild'),
  },
  updates: {
    bundleHelpers: true,
    userConfiguration: {
      checkUpdatesCheckbox: true,
    },
  },
  workflowMetadata: {
    name: 'Search File System',
    category: 'Tools',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
