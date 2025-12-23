import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan, dim } from "kolorist";
import { intro, outro, spinner, text, isCancel, confirm } from "@clack/prompts";
import {
  assertGitRepo,
  getCurrentBranch,
  getBaseBranch,
  getCommitsSinceBase,
  getDiffStatsSinceBase,
  assertGhInstalled,
  assertNotOnBaseBranch,
} from "~/utils/git.js";
import { getConfig } from "~/utils/config.js";
import { generatePRContent, type PRContext } from "~/utils/groq.js";
import { KnownError, handleCliError } from "~/errors.js";
import { getPRPromptFile } from "~/utils/prompt.js";

const runPR = async (baseBranchOverride?: string, isDraft?: boolean) => {
  intro(bgCyan(black(" dash pr ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();

  s.start("Gathering branch information");
  const currentBranch = await getCurrentBranch();
  const baseBranch = baseBranchOverride || (await getBaseBranch());
  await assertNotOnBaseBranch(currentBranch, baseBranch);
  s.stop(`Branch: ${currentBranch} → ${baseBranch}`);

  s.start("Fetching commits");
  const commits = await getCommitsSinceBase(baseBranch);
  const stats = await getDiffStatsSinceBase(baseBranch);

  if (commits.length === 0) {
    s.stop("No commits found");
    throw new KnownError(
      `No commits found between ${baseBranch} and ${currentBranch}.\n` +
        "Make sure you have committed your changes and the base branch exists on the remote."
    );
  }

  s.stop(
    `Found ${commits.length} commit${commits.length > 1 ? "s" : ""} ${dim(
      `(${stats.files} files, +${stats.insertions} -${stats.deletions})`
    )}`
  );

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
  });

  s.start("Generating PR content");
  const customPrompt = await getPRPromptFile();
  const context: PRContext = {
    branchName: currentBranch,
    baseBranch,
    commits: commits.map((c) => ({ message: c.message, body: c.body })),
    stats,
  };

  let prContent;
  try {
    prContent = await generatePRContent(
      config.GROQ_API_KEY,
      config.model,
      context,
      config.timeout,
      config.proxy,
      customPrompt
    );
  } catch (error) {
    s.stop("Failed to generate PR content");
    const fallbackTitle = commits[0]?.message || `Merge ${currentBranch}`;
    const fallbackBody = commits.map((c) => `- ${c.message}`).join("\n");
    prContent = { title: fallbackTitle, body: `## Changes\n\n${fallbackBody}` };
  }
  s.stop("PR content generated");

  const editedTitle = await text({
    message: "PR Title (edit or press Enter to use):",
    initialValue: prContent.title,
    validate: (value) =>
      value && value.trim().length > 0 ? undefined : "Title cannot be empty",
  });

  if (isCancel(editedTitle)) {
    outro("PR creation cancelled");
    return;
  }

  const editedBody = await text({
    message: "PR Description (edit or press Enter to use):",
    initialValue: prContent.body,
  });

  if (isCancel(editedBody)) {
    outro("PR creation cancelled");
    return;
  }

  const finalTitle = String(editedTitle).trim();
  const finalBody = String(editedBody || "").trim();

  const proceed = await confirm({
    message: `Create ${isDraft ? "draft " : ""}PR "${finalTitle}" targeting ${baseBranch}?`,
  });

  if (!proceed || isCancel(proceed)) {
    outro("PR creation cancelled");
    return;
  }

  s.start("Creating pull request");
  try {
    const args = [
      "pr",
      "create",
      "--title",
      finalTitle,
      "--body",
      finalBody,
      "--base",
      baseBranch,
    ];

    if (isDraft) {
      args.push("--draft");
    }

    const { stdout } = await execa("gh", args);
    s.stop("Pull request created");

    const prUrl = stdout.trim();
    outro(`${green("✔")} PR created: ${prUrl}`);
  } catch (error) {
    s.stop("Failed to create PR");
    if (error instanceof Error) {
      throw new KnownError(`Failed to create PR: ${error.message}`);
    }
    throw error;
  }
};

export default command(
  {
    name: "pr",
    flags: {
      base: {
        type: String,
        description: "Base branch for the PR (defaults to main/master)",
        alias: "b",
      },
      draft: {
        type: Boolean,
        description: "Create as draft PR",
        alias: "d",
        default: false,
      },
    },
  },
  (argv) => {
    runPR(argv.flags.base, argv.flags.draft).catch((error) => {
      outro(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);


