<div align="center">

# Alfred Country Info

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Look up any country by its ISO code (`cca2`, `cca3`, `cioc`) or name — and get its flag, official name, capital, region, calling code, currencies, languages, and area at a glance.

## Features 🥷

- Fuzzy search by ISO 3166-1 code (`US`, `USA`), common name (`United States`), or official name.
- Prefix search by international calling code — start the query with `+` (e.g. `+1`, `+972`) to match by phone dialing code.
- Rich inline details: flag emoji, capital, region / subregion, calling code, currencies, languages, land area.
- Codes-first display — the `cca2` / `cca3` pair sits right after the flag, so identifiers are instantly scannable.
- Full `Country` object is passed as the item's `arg`, ready to copy, pipe into another workflow action, or view with Large Type.
- Configurable result count (`slice_amount`) and fuzzy tolerance (`fuzzy_threshold`) via Alfred's workflow configuration.

## Usage

1. Type `con` in Alfred to activate the workflow.
1. Enter a country code, name, or calling code (e.g. `US`, `USA`, `united`, `japan`, `+1`, `+972`).
1. Select a result to copy the full country object to the clipboard.

## Options

`con` - Search for countries by ISO code or name
