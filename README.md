---

## Dash

**Dash** is an AI-powered Git assistant that lives in your terminal. It helps you write better commit messages, open pull requests, and manage issues faster — so you can focus on building instead of writing boilerplate.

Whether you’re working solo or in a team, Dash keeps your Git workflow clean, consistent, and efficient.

---

## ✨ Features

* 🤖 AI-generated commit messages from staged changes
* 🔀 Create pull requests with smart descriptions
* 🐛 Generate GitHub issues from plain text
* 📋 Preview before applying changes
* ⚡ Works directly in your terminal
* 🎯 Conventional commit support
* 🧩 Custom prompt rules per repository
* 🪝 Git hooks for automatic commit generation
* 🔧 Configurable AI models via Groq

---

## 📦 Installation

```bash
npm install -g @koushik_xd/dash
```

> Linux users: If `dash` runs the system shell instead of this CLI, use:
>
> ```bash
> dash-cli
> ```

---

## 🔑 Setup

### 1. Get an API key

Create a free key at:

👉 [https://console.groq.com/keys](https://console.groq.com/keys)

### 2. Configure Dash

```bash
dash config set GROQ_API_KEY=gsk_your_key_here
```

Or use environment variables:

```bash
export GROQ_API_KEY=gsk_your_key_here
```

---

## 🚀 Quick Start

Stage your changes:

```bash
git add .
```

Generate a commit:

```bash
dash commit
```

Create a pull request:

```bash
dash pr
```

That’s it — Dash handles the rest.

---

## 🧠 How It Works

1. Dash reads your Git diff
2. Sends context to the AI model
3. Generates structured output (commit / PR / issue)
4. Shows preview for confirmation
5. Applies changes safely

No changes happen without your approval.

---

## 🛠 Commands

### Commit

Generate commit messages from staged changes:

```bash
dash commit
```

Options:

```bash
dash commit --all           # Stage all changes automatically
dash commit --generate 3    # Suggest multiple messages
dash commit --exclude dist/ # Ignore paths
dash commit --type conventional
```

---

### Pull Requests

Requires GitHub CLI:

👉 [https://cli.github.com/](https://cli.github.com/)

Create PR:

```bash
dash pr
```

Options:

```bash
dash pr --draft
dash pr --base develop
```

Manage PRs:

```bash
dash pr list
dash pr view
dash pr merge --squash
```

---

### Issues

Create issues with AI-generated titles and descriptions:

```bash
dash issue create
dash issue create --label bug
```

List issues:

```bash
dash issue list
dash issue list --state all
dash issue list --limit 10
```

---

### Model Management

View models:

```bash
dash model list
```

Change model:

```bash
dash model set llama-3.3-70b-versatile
```

Open model selector:

```bash
dash model
```

---

### Git Hooks

Install automatic commit generation:

```bash
dash hook install
```

Remove hook:

```bash
dash hook uninstall
```

After installing, running:

```bash
git commit
```

will generate messages automatically.

---

## ⚙️ Configuration

Config file location:

```
~/.dash
```

Set values:

```bash
dash config set <key>=<value>
```

Get values:

```bash
dash config get <key>
```

Options:

| Option       | Default            | Description           |
| ------------ | ------------------ | --------------------- |
| GROQ_API_KEY | —                  | Required API key      |
| model        | openai/gpt-oss-20b | AI model              |
| generate     | 1                  | Number of suggestions |
| type         | —                  | Conventional commits  |
| max-length   | 100                | Message length limit  |
| locale       | en                 | Language              |

Example:

```bash
dash config set type=conventional max-length=72
```

---

## 🎨 Custom Prompts

Add repository-specific rules:

```
.dash/
  commit.md
  pr.md
```

Example:

**.dash/commit.md**

```markdown
Use present tense. Reference Jira tickets.
Keep messages under 72 characters.
```

**.dash/pr.md**

```markdown
Include testing instructions and risk notes.
```

Dash automatically detects and applies these.

Supports monorepos — searches upward for the nearest `.dash` folder.

---

## 🧩 Requirements

* Node.js 18+
* Git
* GitHub CLI (for PR and issue features)
* Groq API key

---

## 🐞 Troubleshooting

### Dash command not found

Check global npm install path:

```bash
npm list -g --depth=0
```

Reinstall if needed:

```bash
npm install -g @koushik_xd/dash
```

---

### GitHub CLI not detected

Install:

```bash
gh auth login
```

---

### API errors

Verify key:

```bash
dash config get GROQ_API_KEY
```

---

## 🔐 Security

* API keys stored locally
* No repository data persisted
* Only diff context sent to model
* User confirmation required before actions

---

## 🤝 Contributing

Contributions are welcome!

1. Fork repo
2. Create branch
3. Make changes
4. Open PR

---

## 💡 Inspiration

Inspired by:

👉 noto by Sithija Nelusha Silva

---

## 📜 License

MIT

---