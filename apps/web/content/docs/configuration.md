---
title: Configuration
description: Configure dash for your workflow.
---

Dash works great by default. Configure it when you need to.

## How it works

Configuration lives in `~/.dash`. Don't edit it manually—use these commands:

```bash
dash config get <key>
dash config set <key>=<value>
```

Examples:

```bash
dash config get GROQ_API_KEY
dash config set model=llama-3.3-70b-versatile
```

Set multiple at once:

```bash
dash config set generate=3 locale=en
```

## Options

### GROQ_API_KEY

Required. Get it from [console.groq.com/keys](https://console.groq.com/keys).

```bash
dash config set GROQ_API_KEY=gsk_your_key_here
```

### model

Default: `openai/gpt-oss-20b`

Which AI model to use. You can change models using the dedicated `model` command or via config.

**Using the model command (recommended):**

```bash
dash model
```

This opens an interactive prompt to select from popular models or enter a custom one. It also shows the Groq models documentation link.

**Quick commands:**

```bash
dash model list
dash model set llama-3.3-70b-versatile
```

**Using config:**

```bash
dash config set model=llama-3.3-70b-versatile
```

**Popular models:**

- `llama-3.3-70b-versatile` - Best quality
- `llama-3.1-8b-instant` - Fast responses
- `mixtral-8x7b-32768` - Large context window (good for big diffs)
- `gemma2-9b-it` - Google model
- `openai/gpt-oss-20b` - Default

Browse all available models at [console.groq.com/docs/models](https://console.groq.com/docs/models).

### generate

Default: `1`

How many commit messages to generate (max: 5). More options = more tokens used.

```bash
dash config set generate=3
```

### type

Default: none

Use `conventional` for conventional commit format:

```bash
dash config set type=conventional
```

Clear it:

```bash
dash config set type=
```

### max-length

Default: `100`

Max characters for commit messages (20-200).

```bash
dash config set max-length=72
```

### locale

Default: `en`

Language for messages. Use ISO 639-1 codes (en, es, ja, etc).

```bash
dash config set locale=ja
```

### timeout

Default: `10000` (10 seconds)

API timeout in milliseconds.

```bash
dash config set timeout=20000
```

### gh_enabled

Default: `true`

Disable GitHub CLI features if you don't have gh installed.

```bash
dash config set gh_enabled=false
```

### proxy

HTTP/HTTPS proxy for API requests.

```bash
dash config set proxy=http://proxy.example.com:8080
```

## Custom prompts

Override the default AI behavior with your own rules. Create a `.dash` folder in your repository root with these files:

### `.dash/commit.md`

Custom prompt for commit messages. When this file exists, dash uses it instead of the built-in system prompt.

```markdown
# Commit Message Guidelines

## Format
Use conventional commits: type: description

## Style Rules
- Use present tense
- Keep under 70 characters
- Include ticket numbers when available

## Examples
- feat: add user authentication
- fix: resolve login redirect bug (#123)
```

### `.dash/pr.md`

Custom prompt for pull requests. Overrides the default PR generation prompt.

```markdown
# Pull Request Guidelines

## Title Format
type: concise description (max 72 chars)

## Description Structure
### Summary
What changed and why

### Changes
- List specific changes
- Include component names

### Testing
How changes were verified

### Related Issues
Fixes #123
```

### Monorepo support

Dash searches up the directory tree to find `.dash` prompts. This works perfectly in monorepos:

```
monorepo/
├── .dash/
│   ├── commit.md    # Root-level prompts
│   └── pr.md
├── packages/
│   ├── api/
│   │   └── .dash/
│   │       └── commit.md    # API-specific prompts
│   └── web/
│       └── .dash/
│           └── commit.md    # Web-specific prompts
```

When you run `dash commit` in `packages/api/`, it uses `packages/api/.dash/commit.md`. If not found, it searches up and uses the root `.dash/commit.md`.

This lets you have:
- **Global rules** at the root
- **Team-specific rules** in each package
- **Project-specific rules** in subdirectories

## Environment variables

Override config with environment variables:

```bash
export GROQ_API_KEY="your-key"
export HTTPS_PROXY="http://proxy:8080"
```

## Flag priority

Command flags override config:

```bash
dash commit --generate 3
```

This uses 3 even if your config says 1.

## Examples

```bash
dash config set GROQ_API_KEY=gsk_xxx generate=3

dash config set type=conventional max-length=72

dash config get model locale
```
