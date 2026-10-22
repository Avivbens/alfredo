<div align="center">

# Alfred Switch Wifi

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Switch between the Wi-Fi networks your Mac has joined before, straight from Alfred

## Prerequisites

Nothing to install - the workflow lists networks with macOS's own `networksetup` tool, and joins with the passwords macOS already saved.

### Accessibility permission

macOS no longer lets a script join a saved network, so the workflow picks it in Control Center's Wi-Fi module for you.
That needs Accessibility access for Alfred, under System Settings › Privacy & Security › Accessibility.

## Features 🥷

- List every Wi-Fi network your Mac has joined before 📶
- Join any of them with a single keystroke
- Turn Wi-Fi on or off with a keyword

## Usage

Type `wifi` in Alfred to list your saved networks, then keep typing to filter by name.
<kbd>↩</kbd> joins the selected network through Control Center, and a notification tells you it is joining - or why it could not.
The keyword is configurable in the workflow settings if `wifi` clashes with something else you use.

Networks start in the order macOS prefers them, and the ones you pick most move up over time.

![Switch Wi-Fi network](https://raw.githubusercontent.com/avivbens/alfredo/HEAD/demo/switch-wifi/switch-network.png)

### Turn Wi-Fi on or off

Type `wifion` or `wifioff` in Alfred and press <kbd>↩</kbd> - a notification confirms the change.
Both keywords are configurable in the workflow settings.

![Turn Wi-Fi on or off](https://raw.githubusercontent.com/avivbens/alfredo/HEAD/demo/switch-wifi/power-keywords.png)

### Why only saved networks?

macOS shares the names of nearby networks, and of the one you are on, only with apps that have Location Services access.
The workflow lists the networks macOS remembers instead, so it needs no extra permission.
Picking a saved network that is out of range fails with a notification.
