<div align="center">

# Alfred Worktree Launcher

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Open or create git worktrees for your pull requests and new tasks, then start an agent session in them, with [Alfred](https://www.alfredapp.com/).

## Features 🥷

- Lists your open pull requests and review requests, and shows which ones already have a worktree
- Maps each pull request to a local clone under your repo folders
- Creates the worktree next to the clone as `<repo>@<name>`, then installs dependencies with the repo's package manager
- Works for pull requests from forks, which are checked out as `pr-<number>` and open without installing dependencies, so their scripts never run on their own
- Starts a new task in its own worktree, on a fresh branch off the latest default branch
- Opens the worktree in VS Code or Cursor, or starts an agent session: in the agent chat in VS Code, or in your terminal with Cursor

## Requirements

The [GitHub CLI](https://cli.github.com) (`gh`), logged in with `gh auth login`.

## Usage

1. Open Alfred and type `wt` followed by a space
1. Type part of a title, repo or number to filter, or paste a pull request URL or a `owner/repo#123` reference
1. Choose a pull request and use one of the keys below

| Key | Action                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| ↩   | Open the worktree in your editor, creating it first if needed. Without a local clone, open the pull request in the browser |
| ⌘ ↩ | Start a new agent session in the worktree, creating it first if needed                                                     |
| ⌥ ↩ | Resume the last agent session in the worktree                                                                              |
| ⇧ ↩ | Open the pull request in the browser                                                                                       |

When the editor setting is VS Code, ⌘ and ⌥ open the session in the agent chat in VS Code: a new chat for ⌘, or the folder's latest session for ⌥. With Cursor, they open the session in your selected terminal app with the agent command.

## New task

1. Open Alfred and type `wtn` followed by a task name, for example `wtn Agenda view`
1. Press ↩ on the `New task` row, then pick a repo. Recently used repos come first, and typing filters the list
1. Use one of the keys below

| Key | Action                                                  |
| --- | ------------------------------------------------------- |
| ↩   | Create the worktree and open it in your editor          |
| ⌘ ↩ | Create the worktree and start a new agent session in it |

The branch is `feat/<name>`, in lowercase with dashes. Type `fix/` or `migration/` first to use that prefix instead. The branch starts from the freshly fetched default branch (`origin/<default>`) and does not track it, so nothing is pushed or compared against the default branch until you set an upstream. The worktree is `<repo>@<name>` next to the clone, with the same install and session behavior as for a pull request. There is no ⌥ ↩, because a new worktree has no session to resume.

## Settings

| Setting               | Default         | What it does                                               |
| --------------------- | --------------- | ---------------------------------------------------------- |
| Pull requests keyword | `wt`            | Lists your pull requests and review requests               |
| New task keyword      | `wtn`           | Starts a new task in its own worktree                      |
| Repo folders          | `~/dev`         | Folders scanned for git clones                             |
| Scan depth            | `3`             | How many folders deep to look for clones                   |
| Editor                | VS Code         | VS Code or Cursor                                          |
| Terminal App          | Native Terminal | Native Terminal, Warp or iTerm2                            |
| Agent command         | `claude`        | Command that starts an agent session                       |
| Agent resume args     | `--continue`    | Added to the command to resume the last session            |
| Install dependencies  | on              | Runs the package manager install after creating a worktree |
| Number of results     | `20`            | How many rows to show                                      |
