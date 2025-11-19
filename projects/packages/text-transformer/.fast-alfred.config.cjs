const { resolve } = require('node:path');
const { author, description, homepage } = require('./package.json');
const { env } = require('node:process');

const README = `
#### Thank you for using Text Transformer! ✨

This workflow has been created using Fast Alfred, a user-friendly workflow builder that simplifies the process of creating Alfred workflows.

## Features

- Grammar: Correct grammar mistakes
- Beautify: Enhance the text for better readability and engagement
- Spell Check: Identify spelling errors without grammar checking
- Translate: Translate text into any language
- Tones: Change the tone of the text be giving input
- Summarize: Summarize the text to be more concise
- Explain: Explain the text in a more understandable way
- Commit Styling: Format commit messages to be more readable
- Table: Transform text into well-formatted markdown tables

#### Use Active App Context
Enable the \`Use Application Context\` option to utilize the current app context for your workflow.  
This feature enhances text styling and formatting, customizing them to meet your specific needs.

## Usage

Use your customized Alfred keyword to activate each command.

### API key

You can generate an OpenAI key via the following link:

https://platform.openai.com/settings/organization/api-keys

### Translate

The translation feature supports two methods:

**Method 1: Quick Select (Recommended)**
Use the language selector command to choose from predefined languages (you can customize these in the workflow settings).
After selecting a language, enter or paste the text you want to translate.

**Method 2: Manual Language Specification**
Enter the target language followed by the \`§\` delimiter and your text.

Examples:
- \`Spanish§ Hello, how are you?\` - Translates to Spanish
- \`French§ Good morning\` - Translates to French
- \`de§ Thank you\` - Translates to German (using language code)
- \`Hello, how are you?\` - Translates to English (default when no language is specified)

**Important:** The \`§\` character separates the language from the text. Without it, the entire input will be translated to English by default.

To view the workflow codebase, click here:
${homepage}
`.trim();

/**
 * @type {import('fast-alfred').FastAlfredConfig}
 */
module.exports = {
  bundlerOptions: {
    rootAssets: ['List Filter Images'],
    targetDir: resolve(__dirname, '../../../', 'dist', env.NX_TASK_TARGET_PROJECT, 'esbuild'),
    productionScripts: ['src/main/**/*.ts'],
  },
  updates: {
    bundleHelpers: true,
    userConfiguration: {
      checkUpdatesCheckbox: true,
    },
  },
  workflowMetadata: {
    name: 'Text Transformer',
    createdby: author.name,
    webaddress: homepage,
    description,
    readme: README,
  },
  tabSize: 2,
};
