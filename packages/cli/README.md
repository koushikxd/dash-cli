# Dash

AI-powered Git CLI for generating commit messages, creating pull requests, and managing GitHub workflows.

## Installation

```bash
npm install -g @koushik/dash
```

After installation, run the setup command:

```bash
dash setup
```

## Requirements

- **Node.js** 18+
- **Git** installed and configured
- **Groq API Key** - Get yours at https://console.groq.com/keys
- **GitHub CLI (gh)** - Optional, required for PR and issue commands. Install from https://cli.github.com/

## Quick Start

```bash
# Configure your Groq API key
dash config set GROQ_API_KEY=gsk_your_api_key_here

# Run setup to configure gh CLI (optional)
dash setup

# Generate AI commit message
dash commit

# Create AI-generated PR
dash pr
```

## Commands

### `dash commit`

Generate AI-powered commit messages based on staged changes.

```bash
dash commit [flags]
```

**Flags:**

| Flag | Alias | Description |
|------|-------|-------------|
| `--generate <n>` | `-g` | Number of messages to generate (default: 1, max: 5) |
| `--exclude <files>` | `-x` | Files to exclude from AI analysis |
| `--all` | `-a` | Automatically stage all tracked file changes |
| `--type <type>` | `-t` | Commit type (conventional) |

**Examples:**

```bash
# Basic usage - generate commit for staged changes
dash commit

# Stage all changes and commit
dash commit --all

# Exclude certain files
dash commit --exclude package-lock.json --exclude dist/

# Generate multiple suggestions
dash commit --generate 3
```

### `dash pr`

Create, list, view, and merge pull requests with AI assistance.

```bash
dash pr [subcommand] [flags]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `create` (default) | Create a new PR or edit existing |
| `list` | List open pull requests |
| `view` | View current branch's PR details |
| `merge` | Merge the current PR |

#### `dash pr` / `dash pr create`

Create a new pull request with AI-generated title and description.

If a PR already exists for the current branch, you can choose to edit it with AI assistance.

```bash
dash pr [flags]
dash pr create [flags]
```

**Flags:**

| Flag | Alias | Description |
|------|-------|-------------|
| `--base <branch>` | `-b` | Base branch for PR (defaults to main/master) |
| `--draft` | `-d` | Create as draft PR |

**Examples:**

```bash
# Create PR with AI-generated content
dash pr

# Create draft PR
dash pr create --draft

# Create PR targeting specific base branch
dash pr --base develop
```

#### `dash pr list`

List open pull requests in the repository.

```bash
dash pr list
```

#### `dash pr view`

View details of the current branch's pull request.

```bash
dash pr view
```

#### `dash pr merge`

Merge the current branch's pull request with AI-generated merge commit message.

```bash
dash pr merge [flags]
```

**Flags:**

| Flag | Alias | Description |
|------|-------|-------------|
| `--squash` | `-s` | Use squash merge |
| `--merge` | `-m` | Use merge commit |
| `--rebase` | `-r` | Use rebase merge |

**Examples:**

```bash
# Interactive merge method selection
dash pr merge

# Squash and merge
dash pr merge --squash
```

### `dash issue`

List repository issues.

```bash
dash issue [subcommand] [flags]
```

#### `dash issue list`

List issues in the repository.

```bash
dash issue list [flags]
```

**Flags:**

| Flag | Alias | Description |
|------|-------|-------------|
| `--state <state>` | `-s` | Filter by state: open, closed, all (default: open) |
| `--limit <n>` | `-l` | Maximum issues to show (default: 20) |

**Examples:**

```bash
# List open issues
dash issue list

# List all issues
dash issue list --state all

# Limit to 10 issues
dash issue list --limit 10
```

### `dash config`

Manage dash configuration.

```bash
dash config <get|set> <key=value...>
```

**Examples:**

```bash
# Set API key
dash config set GROQ_API_KEY=gsk_your_key_here

# Set model
dash config set model=llama-3.3-70b-versatile

# Get current values
dash config get GROQ_API_KEY model

# Set multiple values
dash config set locale=en max-length=100
```

### `dash hook`

Install or uninstall the prepare-commit-msg git hook for automatic AI commit messages.

```bash
dash hook <install|uninstall>
```

**Examples:**

```bash
# Install hook
dash hook install

# Uninstall hook
dash hook uninstall
```

### `dash setup`

Configure dash and check dependencies.

```bash
dash setup
```

This command:
- Checks if GitHub CLI (gh) is installed
- Verifies gh authentication status
- Lets you enable/disable gh-dependent features
- Shows current configuration status

## Configuration

Configuration is stored in `~/.dash`. Available options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `GROQ_API_KEY` | string | - | Your Groq API key (required) |
| `model` | string | openai/gpt-oss-20b | AI model to use |
| `locale` | string | en | Language for generated messages |
| `generate` | number | 1 | Number of commit suggestions |
| `max-length` | number | 100 | Max commit message length (20-200) |
| `timeout` | number | 10000 | API timeout in ms |
| `type` | string | - | Commit type (conventional) |
| `gh_enabled` | boolean | true | Enable gh CLI features |

## Custom Prompts

You can customize AI prompts by creating files in your repository:

- `.dash/commit.md` - Custom commit message prompt
- `.dash/pr.md` - Custom PR description prompt

These files will be used as system prompts when generating content.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (alternative to config) |
| `https_proxy` / `HTTPS_PROXY` | HTTP proxy for API requests |
| `http_proxy` / `HTTP_PROXY` | HTTP proxy fallback |

## gh CLI Features

The following commands require GitHub CLI (gh) to be installed and authenticated:

- `dash pr` (all subcommands)
- `dash issue list`

Commands that work without gh:

- `dash commit`
- `dash hook`
- `dash config`
- `dash setup`

Run `dash setup` to configure gh CLI integration.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit your changes using dash: `dash commit`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a pull request using dash: `dash pr`

### Development Setup

```bash
# Clone the repository
git clone https://github.com/koushikxd/dash.git
cd dash/packages/cli

# Install dependencies
pnpm install

# Build
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test
```

### Project Structure

```
packages/cli/
├── src/
│   ├── commands/
│   │   ├── commit.ts      # AI commit generation
│   │   ├── pr.ts          # PR create/list/view/merge
│   │   ├── issue.ts       # Issue listing
│   │   ├── config.ts      # Configuration management
│   │   ├── hook.ts        # Git hook install/uninstall
│   │   └── setup.ts       # CLI setup wizard
│   ├── utils/
│   │   ├── config.ts      # Config parsing
│   │   ├── git.ts         # Git operations
│   │   ├── groq.ts        # AI API calls
│   │   ├── prompt.ts      # Prompt building
│   │   └── fs.ts          # File utilities
│   ├── errors.ts          # Error handling
│   └── index.ts           # CLI entry point
├── tests/                  # Test files
└── dist/                   # Built output
```

## License

MIT

