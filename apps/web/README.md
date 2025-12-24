# Dash Documentation Website

Next.js documentation site for dash CLI.

## Development

```bash
cd apps/web

pnpm install
pnpm dev
```

Visit [localhost:3000](http://localhost:3000)

## Structure

```
apps/web/
├── app/
│   ├── page.tsx              # Landing page
│   ├── docs/[[...slug]]/     # Docs pages
│   └── layout.tsx
├── content/
│   └── docs/                 # Markdown docs
├── components/               # UI components
├── config/                   # Site config
└── styles/                   # Global styles
```

## Adding docs

1. Create markdown in `content/docs/`
2. Add frontmatter:

```markdown
---
title: Page Title
description: Page description
---

Your content here.
```

3. Update `config/docs.ts` if needed

## Content structure

```
content/docs/
├── introduction.md
├── installation.md
├── configuration.md
├── usage.md
└── reference/
    └── faq.md
```

## Components

MDX components in `components/mdx-components.tsx`:

- Code blocks with syntax highlighting
- Tables, links, headings
- Custom components

## Deployment

Deployed to GitHub Pages automatically on push to main.

## Build

```bash
pnpm build
pnpm start
```

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Content Collections (MDX)
- Tailwind CSS
- Motion (animations)

## License

MIT

