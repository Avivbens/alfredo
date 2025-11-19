<div align="center">

# Alfred Jira Master

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

AI-powered Alfred workflow that creates Jira tickets from Slack threads or any text input. Simply paste your content, and let AI extract the title, description, story points, and other ticket details automatically.

## Features 🥷

- **AI-Powered Extraction**: Uses LLM to intelligently extract ticket information from Slack threads or any text
- **Structured Output**: Generates title, description, story points, issue type, and priority
- **Smart Defaults**: Follows your project's conventions with optional title examples
- **Auto-Create**: Creates Jira tickets directly from Alfred with one command
- **Auto-Open**: Optionally opens created tickets in your browser
- **Rich Preview**: Shows ticket details before creation
- **Multi-Model Support**: Works with OpenAI, Anthropic Claude, and Google Gemini

## Usage

1. Copy a Slack thread or any text describing an issue
2. Open Alfred and type your configured keyword
3. Paste the text into Alfred
4. Wait for AI to extract ticket information
5. Press Enter to create the ticket in Jira

## Example

**Input:**

```
We need to implement OAuth2 authentication for the API.
This should include Google and GitHub providers,
token refresh, and session management.

High priority - launching in 2 weeks. Probably 5 points.
```

**Output:**

```
✅ Created PROJ-123: Implement OAuth2 authentication for API
Story • 5 points • Click to open in Jira
```
