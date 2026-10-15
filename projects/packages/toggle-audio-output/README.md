<div align="center">

# Alfred Toggle Audio Output

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Rapidly change your audio output between your Bluetooth devices and your Mac's speakers

## Prerequisites

This workflow relies on [`switchaudio-osx`](https://github.com/deweller/switchaudio-osx) to list and switch audio devices, and on [`blueutil`](https://github.com/toy/blueutil) to connect Bluetooth devices. Install them before using the workflow:

```bash
brew install switchaudio-osx blueutil
```

> **Note:** Without `switchaudio-osx`, toggling fails with `SwitchAudioSource: command not found`. Without `blueutil`, the `bt` command tells you so and offers the install command to copy.

### Bluetooth permission

macOS asks for Bluetooth access on behalf of the app that runs `blueutil`, which is Alfred.

## Features 🥷

- Rapidly toggle between audio output devices with a single keystroke 🥷
- Force a reconnect to any paired Bluetooth device, straight from Alfred

## Usage

### Toggle the audio output

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

### Connect a Bluetooth device

Type `bt` in Alfred to list every paired Bluetooth device, then keep typing to filter by name or address.
The keyword is configurable in the workflow settings if `bt` clashes with something else you use.

The devices you listed in the workflow settings come first, in the order you wrote them; everything else follows,
connected first. Devices are shown under the name System Settings uses, so the settings list and this one line up.

Selecting a device **forces a reconnect**: it disconnects first and then connects again, which is what recovers a
device that macOS still reports as connected while the audio route is stuck. Once the link is up the workflow also
**routes system audio to that device**, so you do not have to switch the output separately. Devices with no audio role,
such as a watch or a mouse, just connect.

Hold <kbd>⌘</kbd> and press <kbd>↩</kbd> to **disconnect** the selected device instead. The modifier is only active on
devices that are currently connected.

## Configuration

![Configuration](https://raw.githubusercontent.com/avivbens/alfredo/HEAD/demo/toggle-audio-output/settings.png)
