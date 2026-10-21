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

### AirPlay permissions

macOS offers no scriptable way to pick an AirPlay receiver, so the workflow selects it in Control Center's Sound module for you.
That needs Accessibility access for Alfred, under System Settings › Privacy & Security › Accessibility.

AirPlay receivers are found over Bonjour, so macOS may ask you to let Alfred find devices on your local network.

## Features

* Rapidly toggle between audio output devices with a single keystroke 🥷
* Pick any audio output - your Mac's speakers, AirPlay receivers, or paired Bluetooth devices - straight from Alfred
* Force a reconnect to any paired Bluetooth device

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

### Pick an audio output

Type \`bt\` in Alfred to list every audio output you can switch to, then keep typing to filter by name or address.
The keyword is configurable in the workflow settings if \`bt\` clashes with something else you use.

* **Outputs macOS already knows** (speakers, wired, USB, HDMI, connected Bluetooth) - ↩ switches instantly
* **AirPlay receivers** on your network - ↩ streams to them through Control Center
* **Paired Bluetooth devices** - ↩ connects and routes audio there; on a connected one ⌥ forces a reconnect and ⌘ disconnects

The devices you listed in the workflow settings come first, in the order you wrote them.
Everything else follows the current output first, then AirPlay receivers, then Bluetooth devices, with non-audio devices (a watch, an iPad) last.
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
