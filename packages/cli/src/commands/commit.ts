import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan } from "kolorist";
import { intro, outro, spinner, text, isCancel, confirm } from "@clack/prompts";
import {
  assertGitRepo,
  getStagedDiff,
  getDetectedMessage,
  getDiffSummary,
  buildCompactSummary,
} from "~/utils/git.js";
import { getConfig } from "~/utils/config.js";
import { generateCommitMessageFromSummary } from "~/utils/groq.js";
import { KnownError, handleCliError } from "~/errors.js";
import { getCommitPromptFile } from "~/utils/prompt.js";

const buildDiffSnippets = async (
  files: string[],
  perFileMaxLines: number = 30,
  totalMaxChars: number = 4000,
): Promise<string> => {
  try {
    const targetFiles = files.slice(0, 6);
    const parts: string[] = [];
    let remaining = totalMaxChars;

    for (const f of targetFiles) {
      const { stdout } = await execa("git", [
        "diff",
        "--cached",
        "--unified=1",
        "--",
        f,
      ]);
      if (!stdout) continue;

      const lines = stdout.split("\n").filter(Boolean);
      const picked: string[] = [];
      let count = 0;

      for (const line of lines) {
        const isHunk = line.startsWith("@@");
        const isChange =
          (line.startsWith("+") || line.startsWith("-")) &&
          !line.startsWith("+++") &&
          !line.startsWith("---");

        if (isHunk || isChange) {
          picked.push(line);
          count++;
          if (count >= perFileMaxLines) break;
        }
      }

      if (picked.length > 0) {
        const block = [`# ${f}`, ...picked].join("\n");
        if (block.length <= remaining) {
          parts.push(block);
          remaining -= block.length;
        } else {
          parts.push(block.slice(0, Math.max(0, remaining)));
          remaining = 0;
        }
      }
      if (remaining <= 0) break;
    }

    if (parts.length === 0) return "";
    return [
      "Code changes (use this to write the commit message):",
      ...parts,
    ].join("\n\n");
  } catch {
    return "";
  }
};

export const buildSingleCommitPrompt = async (
  files: string[],
  compactSummary: string,
  maxLength: number,
  customPrompt?: string | null,
): Promise<string> => {
  const snippets = await buildDiffSnippets(files, 30, 3500);

  if (customPrompt) {
    return `${customPrompt}

CHANGES SUMMARY:
${compactSummary}

${snippets ? `\n${snippets}\n` : ""}

Maximum ${maxLength} characters. Return only the commit message line, no explanations.`;
  }

  return `Analyze the following git changes and generate a single, complete conventional commit message.

CHANGES SUMMARY:
${compactSummary}

${snippets ? `\n${snippets}\n` : ""}

CRITICAL - READ CAREFULLY:
- Base your message ONLY on what is explicitly shown in the changes above
- DO NOT infer features that aren't directly visible in the code
- If you see className/CSS changes, say "style" or "update UI", NOT "add feature"
- File names can be misleading - focus on the ACTUAL code changes shown
- When uncertain, use conservative terms like "update" or "improve"

TASK: Write ONE conventional commit message describing ONLY what the diff shows.

REQUIREMENTS:
- Format: type: subject (NO scope, just type and subject)
- Maximum ${maxLength} characters
- Describe the actual code change, not assumed functionality
- Use imperative mood, present tense ("add" not "added")
- Include the main component/area affected when clear
- Complete the message - never truncate mid-sentence

COMMIT TYPE SELECTION:
- feat: ONLY for genuinely NEW user-facing features (new components, new API endpoints, new functionality)
- style: UI changes, CSS modifications, styling updates, className changes
- refactor: code improvements, restructuring, internal changes without new functionality
- fix: bug fixes that resolve issues or errors
- docs: documentation changes only
- test: adding or updating tests
- chore: config updates, maintenance, dependency updates

CORRECT EXAMPLES:
- style: update sidebar styling and add mode toggle
- refactor: simplify form validation logic
- fix: handle null case in user lookup
- feat: add OAuth authentication to login
- chore: update package dependencies

WRONG EXAMPLES (hallucinating features not in diff):
- "feat: add collapsible sidebar" when diff only shows CSS
- "feat: implement new dashboard" when diff shows layout tweaks

Return only the commit message line, no explanations.`;
};

export const runCommitWithPush = async (
  generate: number | undefined,
  excludeFiles: string[],
  stageAll: boolean,
  commitType: string | undefined,
  rawArgv: string[],
  promptForPush: boolean = false,
) => {
  intro(bgCyan(black(" dash commit ")));
  await assertGitRepo();

  const detectingFiles = spinner();

  if (stageAll) {
    await execa("git", ["add", "--all"]);
  }

  detectingFiles.start("Detecting staged files");
  const staged = await getStagedDiff(excludeFiles);

  if (!staged) {
    detectingFiles.stop("Detecting staged files");
    throw new KnownError(
      "No staged changes found. Stage your changes manually, or automatically stage all changes with the `--all` flag.",
    );
  }

  const diffSummary = await getDiffSummary(excludeFiles);
  const isLargeDiff = staged.diff.length > 50000;
  const isManyFiles = staged.files.length >= 5;
  const hasLargeIndividualFile = diffSummary?.fileStats.some(
    (f) => f.changes > 500,
  );
  const needsEnhancedAnalysis =
    isLargeDiff || isManyFiles || hasLargeIndividualFile;

  if (needsEnhancedAnalysis && diffSummary) {
    let reason = "Large diff detected";
    if (isManyFiles) reason = "Many files detected";
    else if (hasLargeIndividualFile) reason = "Large file changes detected";

    detectingFiles.stop(
      `${getDetectedMessage(
        staged.files,
      )} (${diffSummary.totalChanges.toLocaleString()} changes):\n${staged.files
        .map((file) => `     ${file}`)
        .join(
          "\n",
        )}\n\n  ${reason} - using enhanced analysis for better commit message`,
    );
  } else {
    detectingFiles.stop(
      `${getDetectedMessage(staged.files)}:\n${staged.files
        .map((file) => `     ${file}`)
        .join("\n")}`,
    );
  }

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
    generate: generate?.toString(),
    type: commitType?.toString(),
  });

  const s = spinner();
  s.start("The AI is analyzing your changes");
  let messages: string[];
  try {
    const customPrompt = await getCommitPromptFile();
    const compact = await buildCompactSummary(excludeFiles, 25);
    if (compact) {
      const enhanced = await buildSingleCommitPrompt(
        staged.files,
        compact,
        config["max-length"],
        customPrompt,
      );
      messages = await generateCommitMessageFromSummary(
        config.GROQ_API_KEY,
        config.model,
        config.locale,
        enhanced,
        config.generate,
        config["max-length"],
        config.type,
        config.timeout,
        config.proxy,
      );
    } else {
      const fileList = staged.files.join(", ");
      const fallbackPrompt = await buildSingleCommitPrompt(
        staged.files,
        `Files: ${fileList}`,
        config["max-length"],
        customPrompt,
      );
      messages = await generateCommitMessageFromSummary(
        config.GROQ_API_KEY,
        config.model,
        config.locale,
        fallbackPrompt,
        config.generate,
        config["max-length"],
        config.type,
        config.timeout,
        config.proxy,
      );
    }
  } finally {
    s.stop("Changes analyzed");
  }

  if (messages.length === 0) {
    throw new KnownError("No commit messages were generated. Try again.");
  }

  const generatedMessage = messages[0];

  const edited = await text({
    message: "Commit message (edit or press Enter to commit):",
    initialValue: generatedMessage,
    validate: (value) =>
      value && value.trim().length > 0 ? undefined : "Message cannot be empty",
  });

  if (isCancel(edited)) {
    outro("Commit cancelled");
    return;
  }

  const finalMessage = String(edited).trim();

  await execa("git", ["commit", "-m", finalMessage, ...rawArgv]);

  outro(`${green("√")} Successfully committed!`);

  if (promptForPush) {
    const shouldPush = await confirm({
      message: "Push to remote? (Press Enter to push, Esc to skip)",
      initialValue: true,
    });

    if (isCancel(shouldPush)) {
      outro("Push cancelled");
      return;
    }

    if (shouldPush) {
      const pushSpinner = spinner();
      pushSpinner.start("Pushing to remote");
      try {
        await execa("git", ["push"]);
        pushSpinner.stop("Pushed to remote");
        outro(`${green("√")} Successfully pushed to remote!`);
      } catch (error: any) {
        pushSpinner.stop("Push failed");
        outro(`${red("×")} Failed to push: ${error.message}`);
      }
    } else {
      outro("Changes not pushed");
    }
  }
};

export default command(
  {
    name: "commit",
    alias: "c",
    help: {
      description: "Generate AI-powered commit messages from staged changes",
    },
    flags: {
      generate: {
        type: Number,
        description: "Number of messages to generate (default: 1)",
        alias: "g",
      },
      exclude: {
        type: [String],
        description: "Files to exclude from AI analysis",
        alias: "x",
      },
      all: {
        type: Boolean,
        description: "Automatically stage changes in tracked files",
        alias: "a",
        default: false,
      },
      type: {
        type: String,
        description: "Type of commit message to generate",
        alias: "t",
      },
    },
    ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
  },
  (argv) => {
    const rawArgv = process.argv.slice(3);
    runCommitWithPush(
      argv.flags.generate,
      argv.flags.exclude,
      argv.flags.all,
      argv.flags.type,
      rawArgv,
      true,
    ).catch((error: any) => {
      outro(`${red("×")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  },
);
