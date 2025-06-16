<div align="center">

# Alfred Table Plus Db

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Quickly launch your saved TablePlus database connections via Alfred. Search and open your database connections with ease, without having to manually navigate through TablePlus interface.

## Features 🥷

- Search through all your saved TablePlus connections
- Fuzzy search support for quick connection finding
- Direct launch of connections via TablePlus protocol

## Usage

1. Open Alfred and type your configured keyword (default: `db`) followed by a space
1. Type the name of the database connection you want to search for (e.g., `db my-prod-db some-env`)
1. The list of matching connections will be displayed with their database names and environments
1. Press Enter to launch the connection directly in TablePlus

## Configuration

The workflow uses the following configurable variables:

- **Connection keyword**: Set your preferred keyword to trigger the workflow (default: `db`)
- **Slice amount**: Maximum number of results to display (default: 10)
- **Fuzzy threshold**: Search sensitivity from 1-10, where lower values are more strict (default: 7)

## Demo

![TablePlus Db Demo](https://raw.githubusercontent.com/Avivbens/alfredo/HEAD/demo/table-plus-db/search-connection.png)
