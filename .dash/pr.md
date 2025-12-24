# Pull Request Guidelines

## Title Format

Use conventional commit style: `type: concise description`

- Maximum 72 characters
- Start with action verb
- Be specific about what changed
- Follow commit type conventions

## Title Examples

- `feat: add OAuth authentication with Google and GitHub`
- `fix: resolve memory leak in data processing`
- `refactor: migrate API to REST architecture`
- `docs: update installation and configuration guide`
- `chore: update dependencies and bump to v2.1.0`

## Description Structure

Write a clear, scannable description with these sections:

### Summary
2-3 sentences explaining what changed and why. Focus on the problem solved and the value added.

### Changes
Bullet list of specific changes:
- New features or functionality added
- Bugs fixed or issues resolved
- Code refactored or improved
- Dependencies updated
- Breaking changes (if any)

Be specific: include component/module names, not just "updated code".

### Testing
Brief description of how changes were verified:
- Tests added or modified
- Manual testing performed
- How to verify it works

### Related Issues (if applicable)
- Fixes #123
- Closes #456
- Related to #789

## Style Guidelines

- **Be descriptive**: Explain WHY and WHAT, not just list files changed
- **Use markdown**: Headers, bullets, code blocks for clarity
- **Be specific**: Mention component names, functions, features affected
- **Focus on impact**: What changes for users/developers
- **Keep it scannable**: Short paragraphs, clear structure
- **Avoid vagueness**: "improvements", "fixes", "updates" need context

## Format Output

Structure your response exactly like this:

```
TITLE: <your title here>
BODY:
<your markdown body here>
```

Do not include any other text or explanations.

