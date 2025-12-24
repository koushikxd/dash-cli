---
title: Introduction
description: Learn what dash is and why you should use it.
---

Dash is an AI-powered CLI that makes Git workflows effortless. It generates commit messages, creates pull requests, and manages issues—all from your terminal.

## Why dash?

We've all been there: staring at an empty commit message box, writing "fix stuff" for the tenth time, or spending 20 minutes crafting a PR description.

Dash fixes this. It analyzes your code changes and generates meaningful commit messages and PR descriptions instantly.

## Quick example

```bash
git add .
dash commit

dash pr
```

That's it. No more writer's block.

## What it does

- **AI commit messages** - Analyzes your diff, writes the message
- **PR creation** - Generates titles and descriptions from your commits
- **Issue management** - Browse issues without leaving terminal
- **Git hooks** - Auto-generate messages when you run `git commit`
- **Conventional commits** - Supports the conventional commit format
- **Custom prompts** - Tailor AI behavior for your team

## Why Groq?

Dash uses Groq's API because it's fast, cheap, and reliable. You get results in seconds, not minutes.

## How it works

1. You stage changes (`git add`)
2. Dash reads your diff
3. AI generates a commit message
4. You review, edit if needed, and commit

Same flow for PRs—Dash reads your commits, generates a description, and creates the PR.

## Large diffs?

For big changes, dash automatically creates compact summaries so you never hit API limits. It works whether you're committing 1 file or 100.

## Inspiration

Dash was inspired by [noto](https://github.com/snelusha/noto), a clean commit message generator by Sithija Nelusha Silva. We took the concept further by adding PR management, GitHub integration, and Groq's fast inference API.

**Ready?** Start with [installation](/docs/installation).
