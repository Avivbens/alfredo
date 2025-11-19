const { resolve } = require('node:path');
const { env } = require('node:process');
const { author, description, homepage } = require('./package.json');

const README = `
#### Thank you for using Jira Master! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- **AI-Powered Extraction**: Uses LLM to intelligently extract ticket information from Slack threads or any text
- **Structured Output**: Generates title, description, story points, issue type, and priority
- **Smart Defaults**: Follows your project's conventions with optional title examples
- **Auto-Create**: Creates Jira tickets directly from Alfred with one command
- **Auto-Open**: Optionally opens created tickets in your browser
- **Rich Preview**: Shows ticket details before creation

## Usage

1. Copy a Slack thread or any text describing an issue
2. Open Alfred and type your keyword
3. Paste the text
4. Wait for AI to extract ticket information
5. Press Enter to create the ticket

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
    name: 'Jira Master',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
