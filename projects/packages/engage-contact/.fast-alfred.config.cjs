const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Engage Contact! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

Search your contacts and engage with them via Alfred, with fuzzy search by name, phone number or email.

Supported apps:
- WhatsApp
- SMS
- Call
- Mail
- FaceTime (Audio & Video)

## Usage

\`ecw\` - WhatsApp
\`ecs\` - SMS
\`ecc\` - Call
\`ecm\` - Mail
\`ecfa\` - FaceTime Audio
\`ecf\` - FaceTime Video

To view the workflow codebase, click here:
${homepage}
`.trim();

/**
 * @type {import('fast-alfred').FastAlfredConfig}
 */
module.exports = {
  bundlerOptions: {
    /**
     * `node-mac-contacts` loads its native module through `bindings`, which probes `<workflow root>/build/Release/contacts.node`,
     * so the bundle must keep these folder names rather than the usual `esbuild/assets`
     */
    targetDir: resolve(__dirname, '../../../', 'dist', env.NX_TASK_TARGET_PROJECT, 'build'),
    assetsDir: 'Release',
    assets: [resolve(__dirname, 'src/assets/contacts.node')],
  },
  updates: {
    bundleHelpers: true,
    userConfiguration: {
      checkUpdatesCheckbox: true,
    },
  },
  workflowMetadata: {
    name: 'Engage Contact',
    category: 'Tools',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
