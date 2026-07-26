<div align="center">

# Alfred Toggle Audio Output

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Rapidly change your audio output between your Bluetooth devices and your Mac's speakers

## Prerequisites

This workflow relies on [`switchaudio-osx`](https://github.com/deweller/switchaudio-osx) to list and switch audio devices. Install it before using the workflow:

```bash
brew install switchaudio-osx
```

> **Note:** Without it, the workflow fails with `SwitchAudioSource: command not found` (exit code 127).

## Features 🥷

Rapidly toggle between audio output devices with a single keystroke! 🥷

## Usage

Configure your preferred audio output devices in the workflow settings.
You can set up multiple devices, such as your Mac's built-in speakers, external speakers, or headphones.

_The list should be sorted in the order you want to switch between them_

### Example

Separate audio outputs in the settings with a line break, like this:

```
MacBook Pro Speakers
AirPods Max
AirPods Pro
```

Once set up, you can use the assigned hotkey to switch between them seamlessly ✨

## Configuration

![Configuration](https://raw.githubusercontent.com/avivbens/alfredo/HEAD/demo/toggle-audio-output/settings.png)
