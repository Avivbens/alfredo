# Contributing to Alfredo

Thank you for your interest in contributing to Alfredo!  
We welcome contributions from the community, whether you're reporting bugs, suggesting enhancements, or submitting code improvements.

> **Note:** Please review our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our expectations for participant behavior.

---

## Table of Contents

- [How to Contribute](#how-to-contribute)
- [Generating New Libraries/Workflows](#generating-new-librariesworkflows)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Pull Requests](#pull-requests)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Additional Resources](#additional-resources)

---

## How to Contribute

To get started, follow these steps:

1. Fork the repository
1. Clone your forked repository
1. Install dependencies with `npm ci --no-fund --no-audit --no-progress`
1. Make changes
1. Test your changes
1. Submit a pull request against the `master` branch 🎉

---

## Generating New Workflows

To help you get started with creating a new library or workflow app within Alfredo, we provide an Nx generator CLI. This generator scaffolds out a new project with all the necessary configuration to work seamlessly with FastAlfred.

```bash
nx g @alfredo/workspace:generate-workflow
```

### Generate a new Library

```bash
nx generate @nx/js:library projects/libs/<your-library-name>
```

> **Note:** The generator CLI is designed to simplify the process of creating new libraries and workflows, ensuring that they are compatible with the FastAlfred framework. It handles the boilerplate code and configuration, allowing you to focus on building your workflow's functionality.

### Important Notes

- Resolve all TODOs in the generated code
- Add the `info.plist` file of your workflow
- Test the workflow with the `nx run <your-workflow-name>:serve` command

---

## Reporting Issues

Before reporting a new issue, please search the [issue tracker](https://github.com/avivbens/alfredo/issues) to see if it has already been reported. When filing an issue, please include:

- A clear and descriptive title.
- A detailed description of the problem.
- Steps to reproduce the issue.
- Expected behavior versus actual behavior.
- Any relevant logs or screenshots.

---

## Feature Requests

We’re always open to new ideas that can help improve Alfredo. If you have an idea for a new workflow or an enhancement:

- Open a new issue and label it as a "feature request".
- Provide a clear description of the feature and its benefits.
- If applicable, explain how it aligns with the overall vision of Alfredo and FastAlfred.

---

## Pull Requests

When you’re ready to submit your changes, follow these guidelines:

1. **Create a Branch:** Branch off from `master` with a descriptive name.
1. **Commit Changes:** Make atomic commits with clear commit messages (see guidelines below).
1. **Push and Open a PR:** Push your branch to your fork and open a pull request against the `master` branch.
1. **Describe Your Changes:** Include a summary of the changes, motivation, and any relevant issue numbers.
1. **Review Process:** Your pull request will be reviewed by a maintainer. You may be asked to make additional changes before it can be merged.

### Important Notes

- Please divide each commit into a single logical change. This helps reviewers grasp your modifications more easily.
- When installing dependencies, the impact will extend to all workflows. Therefore, please separate this commit with a `chore` resolution, unless we intend to update all workflows.
- No need to update the root `README` file - it is automatically generated.

---

## Commit Message Guidelines

We use [semantic-release](https://github.com/semantic-release/semantic-release) and `nx release` to automate our versioning process. Please follow these commit message conventions:

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (formatting, etc.)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **test:** Adding missing tests or correcting existing tests
- **chore:** Changes to the build process or auxiliary tools and libraries
- For breaking changes, add a `BREAKING CHANGE` section to the commit message body:

```git
feat: <description>

BREAKING CHANGE: <description>
```

Each commit message should be clear and follow the structure of a [Conventional Commits](https://www.conventionalcommits.org/) message.

---

## Additional Resources

- [FastAlfred GitHub Page](https://github.com/Avivbens/fast-alfred#readme)
- [Nx Documentation](https://nx.dev)
- [Semantic Release Documentation](https://github.com/semantic-release/semantic-release)
- [Conventional Commits](https://www.conventionalcommits.org/)

Thank you for helping make Alfredo better!
