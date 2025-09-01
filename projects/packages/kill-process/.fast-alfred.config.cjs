const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Kill Process! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Search through your operating system's processes by name, port, PID, or path – and terminate them if necessary.

## Usage

1. Type "!" in Alfred to activate the workflow.
1. Enter the name of the process you want to search for.
1. Select the desired process from the list.
1. Press Enter to kill the selected process.

## Options

\`!\` - Search for processes by name, port, PID, or path.   
\`!!\` - Same, but kill with \`sudo\` permission.   
\`!!!\` - Search & show by port   

#### With resource consumption sorting

\`!m\` - Search for processes, sorted by memory usage.   
\`!c\` - Search for processes, sorted by CPU usage.   


To view the workflow codebase, click here:
${homepage}
`.trim();

/**
 * @type {import('fast-alfred').FastAlfredConfig}
 */
module.exports = {
  bundlerOptions: {
    targetDir: resolve(__dirname, '../../../', 'dist', env.NX_TASK_TARGET_PROJECT, 'esbuild'),
    esmHelpers: true,
    outputFormat: 'esm',
  },
  updates: {
    bundleHelpers: true,
    userConfiguration: {
      checkUpdatesCheckbox: true,
    },
  },
  workflowMetadata: {
    name: 'Kill Process',
    category: 'Tools',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
