import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan, dim, cyan, yellow } from "kolorist";
import {
  intro,
  outro,
  spinner,
  text,
  isCancel,
  confirm,
  select,
} from "@clack/prompts";
import {
  assertGitRepo,
  getCurrentBranch,
  getBaseBranch,
  getCommitsSinceBase,
  getDiffStatsSinceBase,
  buildCompactSummarySinceBase,
  assertGhInstalled,
  assertNotOnBaseBranch,
  getExistingPR,
  getUpstreamRepo,
  type ExistingPR,
} from "~/utils/git.js";
import { getConfig } from "~/utils/config.js";
import {
  generatePRContent,
  generatePRUpdateContent,
  generateMergeCommitMessage,
} from "~/utils/groq.js";
import { KnownError, handleCliError } from "~/errors.js";
import { getPRPromptFile, type PRContext } from "~/utils/prompt.js";

interface PRListItem {
  number: number;
  title: string;
  author: { login: string };
  updatedAt: string;
  url: string;
  headRefName: string;
}

interface PRViewData {
  number: number;
  title: string;
  body: string;
  state: string;
  url: string;
  additions: number;
  deletions: number;
  author: { login: string };
  headRefName: string;
  baseRefName: string;
  mergeable: string;
}

const runPRCreate = async (
  baseBranchOverride?: string,
  isDraft?: boolean,
  issue?: number,
  targetRepo?: string
) => {
  intro(bgCyan(black(" dash pr create ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();

  let finalTargetRepo = targetRepo;

  if (!targetRepo) {
    s.start("Checking repository");
    const upstreamRepo = await getUpstreamRepo();
    s.stop(
      upstreamRepo
        ? `Fork detected (upstream: ${upstreamRepo})`
        : "Repository checked"
    );

    if (upstreamRepo) {
      const createUpstream = await select({
        message: `This is a fork of ${cyan(
          upstreamRepo
        )}. Where should the PR be created?`,
        options: [
          {
            value: upstreamRepo,
            label: `Upstream repository (${upstreamRepo})`,
          },
          { value: "", label: "This fork (your repository)" },
          { value: "cancel", label: "Cancel" },
        ],
      });

      if (isCancel(createUpstream) || createUpstream === "cancel") {
        outro("Operation cancelled");
        return;
      }

      if (createUpstream) {
        finalTargetRepo = createUpstream as string;
      }
    }
  }

  s.start("Gathering branch information");
  const currentBranch = await getCurrentBranch();
  const baseBranch = baseBranchOverride || (await getBaseBranch());
  await assertNotOnBaseBranch(currentBranch, baseBranch);
  s.stop(
    `Branch: ${currentBranch} → ${baseBranch}${
      finalTargetRepo ? ` (${finalTargetRepo})` : ""
    }`
  );

  s.start("Checking for existing PR");
  const existingPR = await getExistingPR();
  s.stop(
    existingPR ? `Found existing PR #${existingPR.number}` : "No existing PR"
  );

  if (existingPR) {
    console.log(`\n${cyan("Existing PR:")} #${existingPR.number}`);
    console.log(`${dim("Title:")} ${existingPR.title}`);
    console.log(`${dim("URL:")} ${existingPR.url}`);
    console.log(`${dim("State:")} ${existingPR.state}\n`);

    const action = await select({
      message:
        "A PR already exists for this branch. What would you like to do?",
      options: [
        { value: "edit", label: "Edit the existing PR with AI assistance" },
        { value: "view", label: "Open PR in browser" },
        { value: "cancel", label: "Cancel" },
      ],
    });

    if (isCancel(action) || action === "cancel") {
      outro("Operation cancelled");
      return;
    }

    if (action === "view") {
      await execa("gh", ["pr", "view", "--web"]);
      outro(`${green("✔")} Opened PR in browser`);
      return;
    }

    if (action === "edit") {
      await handlePREdit(existingPR, baseBranch);
      return;
    }
  }

  await createNewPR(baseBranch, currentBranch, isDraft, issue, finalTargetRepo);
};

const handlePREdit = async (existingPR: ExistingPR, baseBranch: string) => {
  const s = spinner();
  const currentBranch = await getCurrentBranch();

  const editRequest = await text({
    message: "Describe what changes you want to make to the PR:",
    placeholder:
      "e.g., Add more details about the API changes, update the title to be more descriptive",
    validate: (value) =>
      value && value.trim().length > 0
        ? undefined
        : "Please describe the changes",
  });

  if (isCancel(editRequest)) {
    outro("Edit cancelled");
    return;
  }

  s.start("Fetching latest commits");
  const commits = await getCommitsSinceBase(baseBranch);
  const stats = await getDiffStatsSinceBase(baseBranch);
  s.stop(`Found ${commits.length} commit${commits.length > 1 ? "s" : ""}`);

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
  });

  s.start("Generating updated PR content with AI");
  const customPrompt = await getPRPromptFile();
  const diffSummary = await buildCompactSummarySinceBase(baseBranch);
  const context: PRContext = {
    branchName: currentBranch,
    baseBranch,
    commits: commits.map((c) => ({ message: c.message, body: c.body })),
    stats,
    diffSummary: diffSummary || undefined,
  };

  let updatedContent;
  try {
    updatedContent = await generatePRUpdateContent(
      config.GROQ_API_KEY,
      config.model,
      existingPR,
      String(editRequest),
      context,
      config.timeout,
      config.proxy,
      customPrompt
    );
  } catch {
    s.stop("Failed to generate updated content");
    throw new KnownError("Failed to generate PR update. Please try again.");
  }
  s.stop("Updated PR content generated");

  const editedTitle = await text({
    message: "Updated PR Title:",
    initialValue: updatedContent.title,
    validate: (value) =>
      value && value.trim().length > 0 ? undefined : "Title cannot be empty",
  });

  if (isCancel(editedTitle)) {
    outro("Edit cancelled");
    return;
  }

  const editedBody = await text({
    message: "Updated PR Description:",
    initialValue: updatedContent.body,
  });

  if (isCancel(editedBody)) {
    outro("Edit cancelled");
    return;
  }

  const finalTitle = String(editedTitle).trim();
  const finalBody = String(editedBody || "").trim();

  const proceed = await confirm({
    message: `Update PR #${existingPR.number} with new title and description?`,
  });

  if (!proceed || isCancel(proceed)) {
    outro("Edit cancelled");
    return;
  }

  s.start("Updating pull request");
  try {
    await execa("gh", [
      "pr",
      "edit",
      "--title",
      finalTitle,
      "--body",
      finalBody,
    ]);
    s.stop("Pull request updated");
    outro(`${green("✔")} PR #${existingPR.number} updated: ${existingPR.url}`);
  } catch (error) {
    s.stop("Failed to update PR");
    if (error instanceof Error) {
      throw new KnownError(`Failed to update PR: ${error.message}`);
    }
    throw error;
  }
};

const createNewPR = async (
  baseBranch: string,
  currentBranch: string,
  isDraft?: boolean,
  issue?: number,
  targetRepo?: string
) => {
  const s = spinner();

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
    )}${issue ? ` ${dim(`(relates to #${issue})`)}` : ""}`
  );

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
  });

  s.start("Generating PR content");
  const customPrompt = await getPRPromptFile();
  const diffSummary = await buildCompactSummarySinceBase(baseBranch);
  const context: PRContext = {
    branchName: currentBranch,
    baseBranch,
    commits: commits.map((c) => ({ message: c.message, body: c.body })),
    stats,
    issue,
    diffSummary: diffSummary || undefined,
  };

  let prContent;
  try {
    prContent = await generatePRContent(
      config.GROQ_API_KEY,
      config.model,
      context,
      config.timeout,
      config.proxy,
      customPrompt,
      issue
    );
  } catch {
    s.stop("Failed to generate PR content");
    const fallbackTitle = commits[0]?.message || `Merge ${currentBranch}`;
    const fallbackBody = commits.map((c) => `- ${c.message}`).join("\n");
    prContent = {
      title: fallbackTitle,
      body: `## Changes\n\n${fallbackBody}${
        issue ? `\n\nCloses #${issue}` : ""
      }`,
    };
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

  const targetDescription = targetRepo
    ? `${targetRepo}:${baseBranch}`
    : baseBranch;
  const proceed = await confirm({
    message: `Create ${
      isDraft ? "draft " : ""
    }PR "${finalTitle}" targeting ${targetDescription}?`,
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

    if (targetRepo) {
      args.push("--repo", targetRepo);
    }

    const { stdout } = await execa("gh", args);
    s.stop("Pull request created");

    const prUrl = stdout.trim();
    console.log(`\n${green("✔")} PR created: ${cyan(prUrl)}\n`);

    const openInBrowser = await confirm({
      message: "Open PR in browser?",
      initialValue: true,
    });

    if (openInBrowser && !isCancel(openInBrowser)) {
      const viewArgs = ["pr", "view", "--web"];
      if (targetRepo) {
        viewArgs.push("--repo", targetRepo);
      }
      await execa("gh", viewArgs);
      outro(`${green("✔")} Opened in browser`);
    } else {
      outro(`${green("✔")} Done`);
    }
  } catch (error) {
    s.stop("Failed to create PR");
    if (error instanceof Error) {
      throw new KnownError(`Failed to create PR: ${error.message}`);
    }
    throw error;
  }
};

const runPRList = async () => {
  intro(bgCyan(black(" dash pr list ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();
  s.start("Fetching open pull requests");

  try {
    const { stdout } = await execa("gh", [
      "pr",
      "list",
      "--json",
      "number,title,author,updatedAt,url,headRefName",
      "--limit",
      "20",
    ]);

    const prs: PRListItem[] = JSON.parse(stdout);
    s.stop(`Found ${prs.length} open PR${prs.length !== 1 ? "s" : ""}`);

    if (prs.length === 0) {
      outro("No open pull requests");
      return;
    }

    console.log("");
    for (const pr of prs) {
      const date = new Date(pr.updatedAt);
      const relativeTime = getRelativeTime(date);
      console.log(`${green(`#${pr.number}`)} ${pr.title}`);
      console.log(
        `   ${dim(`${pr.headRefName} by ${pr.author.login} • ${relativeTime}`)}`
      );
      console.log(`   ${dim(pr.url)}\n`);
    }

    outro(
      `${dim("Use")} dash pr view ${dim(
        "to see details of current branch's PR"
      )}`
    );
  } catch (error) {
    s.stop("Failed to fetch PRs");
    if (error instanceof Error) {
      throw new KnownError(`Failed to list PRs: ${error.message}`);
    }
    throw error;
  }
};

const runPRView = async () => {
  intro(bgCyan(black(" dash pr view ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();
  s.start("Fetching PR details");

  try {
    const { stdout } = await execa("gh", [
      "pr",
      "view",
      "--json",
      "number,title,body,state,url,additions,deletions,author,headRefName,baseRefName,mergeable",
    ]);

    const pr: PRViewData = JSON.parse(stdout);
    s.stop(`PR #${pr.number}`);

    console.log("");
    console.log(`${cyan("Title:")} ${pr.title}`);
    console.log(`${cyan("Author:")} ${pr.author.login}`);
    console.log(`${cyan("Branch:")} ${pr.headRefName} → ${pr.baseRefName}`);
    console.log(
      `${cyan("State:")} ${
        pr.state === "OPEN" ? green(pr.state) : yellow(pr.state)
      }`
    );
    console.log(
      `${cyan("Changes:")} ${green(`+${pr.additions}`)} ${red(
        `-${pr.deletions}`
      )}`
    );
    console.log(
      `${cyan("Mergeable:")} ${
        pr.mergeable === "MERGEABLE" ? green("Yes") : yellow(pr.mergeable)
      }`
    );
    console.log(`${cyan("URL:")} ${pr.url}`);

    if (pr.body) {
      console.log(`\n${cyan("Description:")}`);
      console.log(dim("─".repeat(50)));
      console.log(
        pr.body.slice(0, 500) + (pr.body.length > 500 ? "\n..." : "")
      );
      console.log(dim("─".repeat(50)));
    }

    console.log("");
    outro(`${dim("Use")} dash pr merge ${dim("to merge this PR")}`);
  } catch {
    s.stop("No PR found for current branch");
    outro(`${yellow("⚠")} No pull request exists for the current branch`);
  }
};

const runPRMerge = async (mergeMethod?: string) => {
  intro(bgCyan(black(" dash pr merge ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();
  s.start("Fetching PR details");

  let pr: PRViewData;
  try {
    const { stdout } = await execa("gh", [
      "pr",
      "view",
      "--json",
      "number,title,body,state,url,additions,deletions,author,headRefName,baseRefName,mergeable",
    ]);
    pr = JSON.parse(stdout);
    s.stop(`PR #${pr.number}: ${pr.title}`);
  } catch {
    s.stop("No PR found");
    throw new KnownError("No pull request exists for the current branch");
  }

  if (pr.state !== "OPEN") {
    throw new KnownError(`PR #${pr.number} is ${pr.state}, cannot merge`);
  }

  if (pr.mergeable !== "MERGEABLE") {
    console.log(`\n${yellow("⚠")} PR may not be mergeable: ${pr.mergeable}`);
    const proceed = await confirm({
      message: "Attempt to merge anyway?",
      initialValue: false,
    });
    if (!proceed || isCancel(proceed)) {
      outro("Merge cancelled");
      return;
    }
  }

  const method =
    mergeMethod ||
    (await select({
      message: "Select merge method:",
      options: [
        { value: "squash", label: "Squash and merge (recommended)" },
        { value: "merge", label: "Create a merge commit" },
        { value: "rebase", label: "Rebase and merge" },
      ],
    }));

  if (isCancel(method)) {
    outro("Merge cancelled");
    return;
  }

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
  });

  s.start("Generating merge commit message");
  let mergeMessage: string;
  try {
    mergeMessage = await generateMergeCommitMessage(
      config.GROQ_API_KEY,
      config.model,
      pr.title,
      pr.body || "",
      config.timeout,
      config.proxy
    );
  } catch {
    mergeMessage = `${pr.title} (#${pr.number})`;
  }
  s.stop("Merge message generated");

  const editedMessage = await text({
    message: "Merge commit message:",
    initialValue: mergeMessage,
    validate: (value) =>
      value && value.trim().length > 0 ? undefined : "Message cannot be empty",
  });

  if (isCancel(editedMessage)) {
    outro("Merge cancelled");
    return;
  }

  const finalMessage = String(editedMessage).trim();

  const proceed = await confirm({
    message: `Merge PR #${pr.number} using ${method}?`,
  });

  if (!proceed || isCancel(proceed)) {
    outro("Merge cancelled");
    return;
  }

  s.start("Merging pull request");
  try {
    const args = [
      "pr",
      "merge",
      `--${method}`,
      "--subject",
      finalMessage,
      "--delete-branch",
    ];
    await execa("gh", args);
    s.stop("Pull request merged");
    outro(`${green("✔")} PR #${pr.number} merged successfully`);
  } catch (error) {
    s.stop("Failed to merge PR");
    if (error instanceof Error) {
      throw new KnownError(`Failed to merge PR: ${error.message}`);
    }
    throw error;
  }
};

const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

export default command(
  {
    name: "pr",
    parameters: ["[subcommand]"],
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
      issue: {
        type: Number,
        description: "Related issue number (adds 'Closes #X' to PR)",
        alias: "i",
      },
      repo: {
        type: String,
        description: "Target repository for fork PRs (e.g., owner/repo)",
        alias: "R",
      },
      squash: {
        type: Boolean,
        description: "Use squash merge (for merge subcommand)",
        alias: "s",
        default: false,
      },
      merge: {
        type: Boolean,
        description: "Use merge commit (for merge subcommand)",
        alias: "m",
        default: false,
      },
      rebase: {
        type: Boolean,
        description: "Use rebase merge (for merge subcommand)",
        alias: "r",
        default: false,
      },
    },
    help: {
      description:
        "Create, list, view, or merge pull requests with AI assistance",
      examples: [
        "dash pr",
        "dash pr create",
        "dash pr create --draft",
        "dash pr create --issue 123",
        "dash pr create --repo owner/repo",
        "dash pr create --issue 42 --repo upstream/project",
        "dash pr list",
        "dash pr view",
        "dash pr merge",
        "dash pr merge --squash",
      ],
    },
  },
  (argv) => {
    const subcommand = argv._.subcommand;

    let handler: Promise<void>;

    switch (subcommand) {
      case "list":
        handler = runPRList();
        break;
      case "view":
        handler = runPRView();
        break;
      case "merge": {
        let method: string | undefined;
        if (argv.flags.squash) method = "squash";
        else if (argv.flags.merge) method = "merge";
        else if (argv.flags.rebase) method = "rebase";
        handler = runPRMerge(method);
        break;
      }
      case "create":
      case undefined:
        handler = runPRCreate(
          argv.flags.base,
          argv.flags.draft,
          argv.flags.issue,
          argv.flags.repo
        );
        break;
      default:
        console.error(`${red("✖")} Unknown subcommand: ${subcommand}`);
        console.log(`\nAvailable subcommands: create, list, view, merge`);
        process.exit(1);
    }

    handler.catch((error) => {
      outro(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);
