const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Country Info! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Look up any country by its ISO code (\`cca2\`, \`cca3\`, \`cioc\`) or name – and get its flag, official name, capital, region, calling code, currencies, languages, and area at a glance.

## Usage

1. Type "con" in Alfred to activate the workflow.
1. Enter a country code, name, or calling code (e.g. \`US\`, \`USA\`, \`united\`, \`japan\`, \`+1\`, \`+972\`).
1. Select a result to copy the full country object to the clipboard.

## Options

\`con\` - Search for countries by ISO code or name.

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
    name: 'Country Info',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
