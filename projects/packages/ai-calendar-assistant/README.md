<div align="center">

# Alfred Ai Calendar Assistant

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Effortlessly create calendar events and reminders using natural language. This workflow intelligently extracts the details from your text and adds them to your calendar or to Apple Reminders, saving you time and effort.

## Features 🥷

- **Natural Language Processing:** Create events and reminders using everyday language.
- **Automatic Detail Extraction:** Intelligently extracts the event title, date, time, and duration.
- **Timezone Correction:** Automatically adjusts for your local timezone.
- **Flexible Time Input:** Understands relative dates like "next Monday" or "tomorrow morning."
- **Reminders:** Send the same natural language to Apple Reminders instead, with due dates and notes.

## Usage

### Calendar events

1. Type `ca` in Alfred to activate the workflow (configurable in the workflow settings).
1. Enter the event details in natural language (e.g., "Meeting with John next Friday at 2pm for like 2-3 hours").
1. Press Enter to create the event in your calendar.

### Reminders

1. Type `re` in Alfred (configurable in the workflow settings).
1. Describe the task in natural language (e.g., "remind me to call the bank tomorrow at 9am").
1. Press Enter to create the reminder.

A reminder with a time gets an alert at that time, a reminder with only a date becomes an all-day reminder, and a reminder with no date at all is simply added to your list. Reminders go to your default list unless you name one in the workflow settings.

Repeating reminders are recognized but cannot be applied.

Hold `⌘` and press `Enter` on any result to preview what was parsed in Large Type before creating it.

> The first time you create a reminder, macOS asks you to let Alfred control Reminders. You can change that later under System Settings → Privacy & Security → Automation.

## Demo

### Relative Time

#### `ca Meet with Joseph tomorrow around 11 for like 2-3 hours, then go to the gym, would take me 1.5 hours`

![Relative Time](https://raw.githubusercontent.com/Avivbens/alfredo/HEAD/demo/ai-calendar-assistant/relative-time-events.gif)

### All Day Events

#### `ca from jul 7 to 9, meet with Angela in Berlin, The day before at noon - buy a suitcase`

![All Day](https://raw.githubusercontent.com/Avivbens/alfredo/HEAD/demo/ai-calendar-assistant/all-day-events.gif)

---

## Configuration

![Configuration](https://raw.githubusercontent.com/avivbens/alfredo/HEAD/demo/ai-calendar-assistant/settings.png)
