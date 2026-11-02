<div align="center">

# Alfred Worktree Launcher

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/kcao7snkgx)

</div>

## Description

Open or create git worktrees for your pull requests and new tasks, then start an agent session in them, with [Alfred](https://www.alfredapp.com/).

## Features 🥷

- Lists your open pull requests, review requests and pull requests assigned to you, shows which ones already have a worktree, and matches the title, repo, number or branch as you type
- Maps each pull request to a local clone under your repo folders
- Creates the worktree next to the clone as `<repo>@<name>`, then installs dependencies with the repo's package manager
- Works for pull requests from forks, which are checked out as `pr-<number>` and open without installing dependencies, so their scripts never run on their own
- Groups the pull requests of a GitHub stack and opens every layer in one folder
- Starts a new task in its own worktree, on a fresh branch off the latest default branch
- Opens the worktree in VS Code or Cursor, or starts an agent session: in the agent chat in VS Code, or in your terminal with Cursor

## Requirements

The [GitHub CLI](https://cli.github.com) (`gh`), logged in with `gh auth login`.

## Usage

1. Open Alfred and type `wt` followed by a space
1. Type part of a title, repo, number or branch to filter, or paste a pull request URL or a `owner/repo#123` reference
1. Choose a pull request and use one of the keys below

| Key | Action                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------- |
| ↩   | Open the worktree in your editor, creating it first if needed. Without a local clone, open the pull request in the browser |
| ⌘ ↩ | Start a new agent session in the worktree, creating it first if needed                                                     |
| ⌥ ↩ | Resume the last agent session in the worktree                                                                              |
| ⇧ ↩ | Open the pull request in the browser                                                                                       |

When the editor setting is VS Code, ⌘ and ⌥ open the session in the agent chat in VS Code: a new chat for ⌘, or the folder's latest session for ⌥. With Cursor, they open the session in your selected terminal app with the agent command.

## Stacked pull requests

The pull requests of one GitHub stack show together, bottom to top, under a header row `┌ Stack <n> · <repo> · <k> PRs`. Each layer reads `│ <position>/<size> · <title>`, and the last layer shown starts with `└ ` instead, so the group reads as one tree while you type. A layer's subtitle adds ` · on #<n>` for the layer below, and the location shows `(on <p>/<size>)` when the stack's folder is on another layer. A local `gh stack` whose top layer is not pushed yet still counts. If GitHub rejects the stack fields, the list falls back to plain pull requests.

A stack lives in one folder, `<repo>@stack-<n>`, and ↩ on a layer opens it:

- If the folder is on another layer and has no uncommitted changes (untracked files don't count), it switches to that layer first
- With uncommitted changes, or in the middle of a rebase, it opens the folder unchanged and a notification says why
- With no folder yet, it creates one and fetches every open layer

The header only labels the group and shows the stack's folder. On a layer, ⌘ and ⌥ start or resume a session as usual, and ⇧ opens the pull request. Stacks from forks keep one worktree per pull request.

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

| Setting               | Default         | What it does                                                         |
| --------------------- | --------------- | -------------------------------------------------------------------- |
| Pull requests keyword | `wt`            | Lists your pull requests, review requests and assigned pull requests |
| New task keyword      | `wtn`           | Starts a new task in its own worktree                                |
| Repo folders          | `~/dev`         | Folders scanned for git clones                                       |
| Scan depth            | `3`             | How many folders deep to look for clones                             |
| Editor                | VS Code         | VS Code or Cursor                                                    |
| Terminal App          | Native Terminal | Native Terminal, Warp or iTerm2                                      |
| Agent command         | `claude`        | Command that starts an agent session                                 |
| Agent resume args     | `--continue`    | Added to the command to resume the last session                      |
| Install dependencies  | on              | Runs the package manager install after creating a worktree           |
| Number of results     | `20`            | How many rows to show                                                |
