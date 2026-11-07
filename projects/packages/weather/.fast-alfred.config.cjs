const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Weather! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- Shows the weather where you are and at your saved places
- Today's high and low, rain, UV index and wind at a glance

## Usage

1. Type \`weather\` in Alfred
1. Type part of a place name to filter the list

Add places in the workflow configuration, one per line: a name like \`Haifa\`, or \`Label: lat, lon\`.

Weather data by Open-Meteo (CC BY 4.0). The current location comes from your IP address.

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
    name: 'Weather',
    category: 'Tools',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
