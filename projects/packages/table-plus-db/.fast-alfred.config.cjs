const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using TablePlus Db! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- Search through all your saved TablePlus connections
- Fuzzy search support for quick connection finding
- Direct launch of connections via TablePlus protocol

## Usage

1. Open Alfred and type your configured keyword (default: \`db\`) followed by a space
2. Type the name of the database connection you want to search for (e.g., \`db my-prod-db some-env\`)
3. The list of matching connections will be displayed with their database names and environments
4. Press Enter to launch the connection directly in TablePlus

## Configuration

The workflow uses the following configurable variables:
- **Connection keyword**: Set your preferred keyword to trigger the workflow (default: \`db\`)
- **Slice amount**: Maximum number of results to display (default: 10)
- **Fuzzy threshold**: Search sensitivity from 1-10, where lower values are more strict (default: 4)

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
    name: 'TablePlus Db',
    category: 'Tools',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
