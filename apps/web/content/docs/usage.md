---
title: Usage
description: Use dash's commands and features.
---

Everything you can do with dash.

## Commit messages

### Basic use

```bash
git add .
dash commit
```

Dash shows you a message. Use it, edit it, or cancel.

### Stage everything

```bash
dash commit --all
```

Same as `git commit --all`—stages tracked files before committing.

### Multiple options

```bash
dash commit --generate 3
```

Generates 3 messages to choose from. Uses more tokens.

### Conventional commits

```bash
dash commit --type conventional
```

Follows the [Conventional Commits](https://conventionalcommits.org/) format.

### Exclude files

```bash
dash commit --exclude package-lock.json --exclude dist/
```

Ignores certain files when analyzing changes.

## Pull requests

Requires [GitHub CLI](https://cli.github.com/) installed and authenticated.

### Create PR

```bash
dash pr
```

Analyzes your commits, generates title and description, creates the PR. If a PR exists, you can edit it. After creation, prompts to open the PR in your browser.

**Options:**

- `--draft` or `-d` - Create as draft PR
- `--base <branch>` or `-b` - Target branch (defaults to main/master)
- `--issue <number>` or `-i` - Link to an issue (adds "Closes #X")
- `--repo <owner/repo>` or `-R` - Target repository for fork PRs

```bash
dash pr --draft
dash pr --base develop
dash pr --issue 123
dash pr --repo owner/repo
```

When working on a fork, dash detects it and asks if you want to create the PR on the upstream repository.

### List PRs

```bash
dash pr list
```

### View current PR

```bash
dash pr view
```

### Merge PR

```bash
dash pr merge
```

Prompts to select merge method. Or specify directly:

- `--squash` or `-s` - Squash and merge (recommended)
- `--merge` or `-m` - Create a merge commit
- `--rebase` or `-r` - Rebase and merge

```bash
dash pr merge --squash
```

## Issues

```bash
dash issue list
```

**Options:**

- `--state <state>` or `-s` - Filter by state: open, closed, or all (default: open)
- `--limit <number>` or `-l` - Number of issues to show (default: 20)

```bash
dash issue list --state all --limit 10
```

## Model selection

Change the AI model used for generation.

### Interactive selection

```bash
dash model
```

Opens a prompt to select from popular models or enter a custom one. Shows a link to [Groq's model docs](https://console.groq.com/docs/models) for reference.

### List models

```bash
dash model list
```

Shows popular models with your current selection highlighted.

### Set directly

```bash
dash model set llama-3.3-70b-versatile
```

Skip the prompt and set a model directly.

## Git hooks

Auto-generate messages when you run `git commit`.

### Install

```bash
dash hook install
```

### Use

```bash
git add .
git commit
```

Dash generates the message, Git opens your editor to review it. Save and close to commit.

Want your own message? Use `git commit -m "message"` as usual.

### Uninstall

```bash
dash hook uninstall
```

## Custom prompts

Create a `.dash` folder with custom rules:

```bash
mkdir .dash
```

**`.dash/commit.md`** - Commit message guidelines:

```markdown
Use present tense. Include ticket numbers.
```

**`.dash/pr.md`** - PR description guidelines:

```markdown
Include testing steps and ticket links.
```

When these files exist, dash uses them instead of the default prompts.

### Monorepo support

Dash searches up the directory tree, so you can have different prompts per package:

```
monorepo/
├── .dash/commit.md         # Global rules
└── packages/
    ├── api/.dash/commit.md # API-specific rules
    └── web/.dash/commit.md # Web-specific rules
```

Run `dash commit` in any package, and it uses the nearest `.dash` prompts.

## Branch summary

Get a comprehensive overview of changes in your current branch.

### Basic use

```bash
dash summary
```

Compares your current branch against the default branch (main/master) and generates:
- Statistics (files changed, additions, deletions)
- AI-generated summary of what happened
- Detailed list of changes in bullet points

### Compare with specific branch

```bash
dash summary develop
```

Compares your current branch against the specified target branch.

## Large diffs

Dash handles big changes automatically. It summarizes stats and includes code snippets so you never hit API limits.

## Command reference

```bash
dash commit [-g <n>] [-x <files>] [-a] [-t <type>]
dash pr [create|list|view|merge] [-b <branch>] [-d] [-i <issue>] [-R <repo>]
dash issue list [-s <state>] [-l <n>]
dash model [list|set <model>]
dash hook <install|uninstall>
dash summary [branch]
dash config <get|set> <key=value>
dash setup
```

## Quick examples

```bash
git add .
dash commit

dash commit --all --generate 3

dash commit --type conventional --exclude dist/

dash pr --draft --base develop

dash pr --issue 42 --repo upstream/project

dash pr merge --squash

dash issue list --state all --limit 10

dash model

dash model set llama-3.3-70b-versatile

dash hook install

dash summary

dash summary develop
```

Need more details? Check [Configuration](/docs/configuration).
