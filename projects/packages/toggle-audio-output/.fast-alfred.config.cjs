const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Toggle Audio Output! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Prerequisites

This workflow relies on \`switchaudio-osx\` to list and switch audio devices, and on \`blueutil\` to connect Bluetooth devices. Install them before using the workflow:

\`\`\`bash
brew install switchaudio-osx blueutil
\`\`\`

Without \`switchaudio-osx\`, toggling fails with \`SwitchAudioSource: command not found\`.
Without \`blueutil\`, the \`bt\` command tells you so and offers the install command to copy.

### Bluetooth permission

macOS asks for Bluetooth access on behalf of the app that runs \`blueutil\`, which is Alfred.

## Features

* Rapidly toggle between audio output devices with a single keystroke 🥷
* Force a reconnect to any paired Bluetooth device, straight from Alfred

## Usage

### Toggle the audio output

Configure your preferred audio output devices in the workflow settings.
You can set up multiple devices, such as your Mac's built-in speakers, external speakers, or headphones.

*The list should be sorted in the order you want to switch between them*

### Example

Separate audio outputs in the settings with a line break, like this:

\`\`\`
MacBook Pro Speakers
AirPods Max
AirPods Pro
\`\`\`

Once set up, you can use the assigned hotkey to switch between them seamlessly ✨

### Connect a Bluetooth device

Type \`bt\` in Alfred to list every paired Bluetooth device, then keep typing to filter by name or address.

The devices you listed in the workflow settings come first, in the order you wrote them; everything else follows, connected first.
Devices are shown under the name System Settings uses, so the settings list and this one line up.


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
    name: 'Toggle Audio Output',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
