# Dash

AI-powered Git workflow CLI. Generate commit messages, create pull requests, and manage issues with intelligent assistance.

## Installation

```bash
npm install -g @koushik/dash
```

## Setup

Get your API key from [Groq Console](https://console.groq.com/keys) and configure:

```bash
dash config set GROQ_API_KEY=gsk_your_api_key_here
```

Or use an environment variable:

```bash
export GROQ_API_KEY=gsk_your_api_key_here
```

## Commands

### Commit

Generate AI-powered commit messages from staged changes:

```bash
dash commit
```

Options:

```bash
dash commit --all              # Stage all tracked files before committing
dash commit --generate 3       # Generate multiple message options
dash commit --exclude file.ts  # Exclude files from analysis
dash commit --type conventional
```

### Pull Requests

Create and manage pull requests with AI-generated titles and descriptions:

```bash
dash pr                  # Create a new PR
dash pr create --draft   # Create as draft
dash pr create --base develop
dash pr list             # List open PRs
dash pr view             # View current branch's PR
dash pr merge            # Merge current PR
dash pr merge --squash   # Squash and merge
```

### Issues

List repository issues:

```bash
dash issue list
dash issue list --state all
dash issue list --limit 10
```

### Git Hook

Install a git hook to automatically generate commit messages:

```bash
dash hook install
dash hook uninstall
```

## Configuration

All configuration is stored in `~/.dash`.

```bash
dash config set <key>=<value>
dash config get <key>
```

Available options:

| Option       | Default            | Description                    |
| ------------ | ------------------ | ------------------------------ |
| GROQ_API_KEY | -                  | Groq API key (required)        |
| model        | openai/gpt-oss-20b | AI model                       |
| locale       | en                 | Commit message language        |
| max-length   | 100                | Max commit message length      |
| timeout      | 10000              | API timeout in ms              |
| generate     | 1                  | Number of messages to generate |

Examples:

```bash
dash config set model=llama-3.3-70b-versatile
dash config set max-length=72
dash config set locale=en
```

## Custom Prompts

Create a `.dash-commit-prompt` file in your repository root to customize commit message generation:

```
Generate commit messages following our team conventions.
Always use present tense and reference ticket numbers when available.
```

For PR generation, create `.dash-pr-prompt`.

## Requirements

- Node.js 18+
- Git
- GitHub CLI (`gh`) for PR and issue commands

## License

MIT
