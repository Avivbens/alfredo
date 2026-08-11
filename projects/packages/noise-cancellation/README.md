<div align="center">

# Alfred Noise Cancellation

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Toggle noise cancellation on and off directly from Alfred.

> **Note:** Currently, MacOS 26 does not provide a public API for noise cancellation, so this workflow uses private APIs with AppleScripts. Use at your own risk!

## Usage

Use the keyword `nct` to toggle noise cancellation on or off.

> **Note:** Your headphones must be the selected audio output, otherwise macOS does not render a Listening Mode section to toggle.

## Configuration

`Alternate Listening Mode` - which mode to switch to when Noise Cancellation is already on. Defaults to `Adaptive`.

| Option         | Behaviour                                                                     |
| -------------- | ----------------------------------------------------------------------------- |
| `Adaptive`     | Toggles between Noise Cancellation and Adaptive                               |
| `Transparency` | Toggles between Noise Cancellation and Transparency                           |
| `Off`          | Toggles between Noise Cancellation and Off, on devices that offer an Off mode |

## Demo

### Toggle Noise Cancellation

![Toggle](https://raw.githubusercontent.com/Avivbens/alfredo/HEAD/demo/noise-cancellation/toggle.gif)
