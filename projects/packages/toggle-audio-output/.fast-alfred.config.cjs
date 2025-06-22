const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Toggle Audio Output! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Rapidly toggle between audio output devices with a single keystroke! 🥷

## Usage

Configure your preferred audio output devices in the workflow settings.
You can set up multiple devices, such as your Mac's built-in speakers, external speakers, or headphones.

*The list should be sorted in the order you want to switch between them*

### Example

Separate audio outputs with a line break. in the settings, like this:

\`\`\`
MacBook Pro Speakers
AirPods Max
AirPods Pro
\`\`\`

Once set up, you can use the assigned hotkey to switch between them seamlessly ✨

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
    name: 'Toggle Audio Output',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
