const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');
const { API_KEY_README_SECTION } = require('../../libs/llm/readme.cjs');

const README = `
#### Thank you for using Ai Calendar Assistant! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- **Natural Language Processing:** Create events and reminders using everyday language.
- **Automatic Detail Extraction:** Intelligently extracts the event title, date, time, and duration.
- **Timezone Correction:** Automatically adjusts for your local timezone.
- **Flexible Time Input:** Understands relative dates like "next Monday" or "tomorrow morning."
- **Reminders:** Send the same natural language to Apple Reminders instead, with due dates and notes.

## Usage

### Calendar events

1. Type \`ca\` in Alfred to activate the workflow (configurable in the workflow settings).
2. Enter the event details in natural language (e.g., "Meeting with John next Friday at 2pm for like 2-3 hours").
3. Press Enter to create the event in your calendar.

### Reminders

1. Type \`re\` in Alfred (configurable in the workflow settings).
2. Describe the task in natural language (e.g., "remind me to call the bank tomorrow at 9am").
3. Press Enter to create the reminder.

A reminder with a time gets an alert at that time, a reminder with only a date becomes an all-day reminder, and a reminder with no date at all is simply added to your list. Reminders go to your default list unless you name one in the workflow settings.

Repeating reminders are recognized but cannot be applied.

Hold \`⌘\` and press \`Enter\` on any result to preview what was parsed in Large Type before creating it.

The first time you create a reminder, macOS asks you to let Alfred control Reminders. You can change that later under System Settings → Privacy & Security → Automation.

${API_KEY_README_SECTION}

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
    name: 'AI Calendar Assistant',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
