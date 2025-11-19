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

## Examples

### Example - From Slack Thread (Bug Report)

**Input:**

```
@sarah [2:34 PM]
Our checkout page is broken on Safari. Getting "undefined is not an object" errors in console.

@mike.dev [2:36 PM]
Can confirm. Only affects Safari 17+. Works fine on Chrome and Firefox.

@product.manager [2:38 PM]
This is critical - Safari is 35% of our traffic. Need fix ASAP.

@sarah [2:39 PM]
Looking at the error, seems related to the new payment widget. Should be quick fix, maybe 2 points?
```

**AI Extraction (Preview in Alfred):**

```
[Bug] [Checkout] Fix undefined error on Safari 17+ with payment widget | Bug • 2 points • Highest | Press...
```

```
✅ SHOP-456: Fix checkout errors on Safari 17+

Type: Bug
Priority: Highest
Story Points: 2
Status: To Do

Description:
Checkout page fails on Safari 17+ with "undefined is not an object" console errors.

Steps to Reproduce:
• Open checkout page on Safari 17+
• Attempt to complete purchase
• Error appears in console

Impact:
• Affects 35% of user traffic
• Payment widget integration issue
• Works correctly on Chrome and Firefox

🔗 https://yourcompany.atlassian.net/browse/SHOP-456
```
