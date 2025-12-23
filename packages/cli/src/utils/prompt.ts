import type { CommitType } from "~/utils/config.js";
import { findUp, readFile } from "~/utils/fs.js";
import { assertGitRepo } from "~/utils/git.js";

const commitTypeFormats: Record<CommitType, string> = {
  "": "<commit message>",
  conventional: "<type>(<optional scope>): <commit message>",
};

const commitTypes: Record<CommitType, string> = {
  "": "",
  conventional: `Choose the most appropriate type from the following categories that best describes the git diff:

${JSON.stringify(
  {
    feat: "A NEW user-facing feature or functionality that adds capabilities",
    fix: "A bug fix that resolves an existing issue",
    docs: "Documentation only changes (README, comments, etc)",
    style:
      "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
    refactor:
      "Code restructuring, improvements, or internal changes that enhance existing functionality",
    perf: "A code change that improves performance",
    test: "Adding missing tests or correcting existing tests",
    build: "Changes that affect the build system or external dependencies",
    ci: "Changes to our CI configuration files and scripts",
    chore:
      "Maintenance tasks, config updates, dependency updates, or internal tooling changes",
    revert: "Reverts a previous commit",
  },
  null,
  2
)}

IMPORTANT: 
- Use 'feat' ONLY for NEW user-facing features
- Use 'refactor' for code improvements, restructuring, or internal changes
- Use 'chore' for config updates, maintenance, or internal tooling
- Use the exact type name from the list above.`,
};

export const generatePrompt = (
  locale: string,
  maxLength: number,
  type: CommitType
) => {
  const basePrompt = `You are a professional git commit message generator. Generate ONLY conventional commit messages.

CRITICAL RULES:
- Return ONLY the commit message line, nothing else
- Use format: type: subject (NO scope, just type and subject)
- Maximum ${maxLength} characters (be concise but complete)
- Imperative mood, present tense
- Be specific and descriptive
- NO explanations, questions, or meta-commentary
- ALWAYS complete the message - never truncate mid-sentence

COMMIT TYPES:
- feat: NEW user-facing feature or functionality
- fix: bug fix that resolves an issue
- docs: documentation changes only
- style: formatting, no logic change
- refactor: code restructuring, improvements, or internal changes
- perf: performance improvements
- test: adding/updating tests
- build: build system changes
- ci: CI/CD changes
- chore: maintenance tasks, dependencies, config updates

QUALITY GUIDELINES:
- Start with the most important change
- Use specific, descriptive language
- Include the main component/area affected
- Be clear about what was done, not just what files changed
- Use proper grammar and punctuation

EXAMPLES (correct format - NO scope, just type and subject):
- feat: add user login with OAuth integration
- fix: resolve memory leak in image processing service
- refactor: improve message generation with better prompts
- refactor: increase default max-length from 50 to 100
- docs: update installation and configuration guide
- test: add unit tests for JWT token validation
- chore: update axios to v1.6.0 for security patches

WRONG FORMAT (do not use):
- feat(auth): add user login
- refactor(commit): improve prompts

${commitTypes[type] ? `\nDETAILED TYPE GUIDELINES:\n${commitTypes[type]}` : ""}

Language: ${locale}
Output format: ${commitTypeFormats[type] || "type: subject"}

Generate a single, complete, professional commit message that accurately describes the changes.`;

  return basePrompt;
};

const getGitRoot = async (): Promise<string | null> => {
  try {
    return await assertGitRepo();
  } catch {
    return null;
  }
};

export const getCommitPromptFile = async (): Promise<string | null> => {
  const root = await getGitRoot();
  const promptPath = await findUp(".dash/commit.md", {
    stopAt: root || process.cwd(),
    type: "file",
  });
  if (!promptPath) return null;
  return readFile(promptPath);
};

export const getPRPromptFile = async (): Promise<string | null> => {
  const root = await getGitRoot();
  const promptPath = await findUp(".dash/pr.md", {
    stopAt: root || process.cwd(),
    type: "file",
  });
  if (!promptPath) return null;
  return readFile(promptPath);
};
