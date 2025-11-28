const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Noise Cancellation! ✨

## Features

Toggle noise cancellation on and off directly from Alfred.
Currently, MacOS 26 does not provide a public API for noise cancellation, so this workflow uses private APIs with AppleScripts. Use at your own risk!

## Usage

Use the keyword \`nct\` to toggle noise cancellation on or off.

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
    name: 'Noise Cancellation',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
