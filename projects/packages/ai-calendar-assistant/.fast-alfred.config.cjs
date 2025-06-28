const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Ai Calendar Assistant! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- **Natural Language Processing:** Create events using everyday language.
- **Automatic Detail Extraction:** Intelligently extracts the event title, date, time, and duration.
- **Timezone Correction:** Automatically adjusts for your local timezone.
- **Flexible Time Input:** Understands relative dates like "next Monday" or "tomorrow morning."

## Usage

1. Type \`ca\` in Alfred to activate the workflow (configurable in the workflow settings).
2. Enter the event details in natural language (e.g., "Meeting with John next Friday at 2pm for like 2-3 hours").
3. Press Enter to create the event in your calendar.

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
    name: 'AI Calendar Assistant',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
