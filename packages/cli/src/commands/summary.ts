import { command } from "cleye";
import { black, green, red, bgCyan, dim, cyan } from "kolorist";
import { intro, outro, spinner } from "@clack/prompts";
import {
  assertGitRepo,
  getCurrentBranch,
  getBaseBranch,
  getCommitsSinceBase,
  getDiffStatsSinceBase,
  buildCompactSummarySinceBase,
} from "~/utils/git.js";
import { getConfig } from "~/utils/config.js";
import { generateBranchSummary } from "~/utils/groq.js";
import { KnownError, handleCliError } from "~/errors.js";
import { getSummaryPromptFile, type SummaryContext } from "~/utils/prompt.js";

const runSummary = async (targetBranchOverride?: string) => {
  intro(bgCyan(black(" dash summary ")));

  await assertGitRepo();

  const s = spinner();

  s.start("Gathering branch information");
  const currentBranch = await getCurrentBranch();
  const targetBranch = targetBranchOverride || (await getBaseBranch());

  if (currentBranch === targetBranch) {
    s.stop("Branch information gathered");
    throw new KnownError(
      `You are currently on "${currentBranch}". Cannot compare a branch to itself.\n` +
        "Switch to a feature branch or specify a different target branch."
    );
  }

  s.stop(`Branch: ${currentBranch} vs ${targetBranch}`);

  s.start("Fetching commits and changes");
  const commits = await getCommitsSinceBase(targetBranch);
  const stats = await getDiffStatsSinceBase(targetBranch);

  if (commits.length === 0) {
    s.stop("No commits found");
    throw new KnownError(
      `No commits found between ${targetBranch} and ${currentBranch}.\n` +
        "Make sure both branches exist and there are commits to compare."
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

  s.start("Generating branch summary with AI");
  const customPrompt = await getSummaryPromptFile();
  const diffSummary = await buildCompactSummarySinceBase(targetBranch);
  const context: SummaryContext = {
    currentBranch,
    targetBranch,
    commits: commits.map((c) => ({ message: c.message, body: c.body })),
    stats,
    diffSummary: diffSummary || undefined,
  };

  let summary: string;
  try {
    summary = await generateBranchSummary(
      config.GROQ_API_KEY,
      config.model,
      context,
      config.timeout,
      config.proxy,
      customPrompt
    );
  } catch {
    s.stop("Failed to generate summary");
    throw new KnownError("Failed to generate branch summary. Please try again.");
  }
  s.stop("Branch summary generated");

  console.log("");
  console.log(
    `${cyan("Branch:")} ${currentBranch} ${dim("→")} ${targetBranch}`
  );
  console.log(
    `${cyan("Stats:")} ${stats.files} files, ${green(`+${stats.insertions}`)} ${red(`-${stats.deletions}`)}`
  );
  console.log(
    `${cyan("Commits:")} ${commits.length} commit${commits.length > 1 ? "s" : ""}`
  );
  console.log("");
  console.log(dim("─".repeat(60)));
  console.log("");
  console.log(summary);
  console.log("");
  console.log(dim("─".repeat(60)));

  outro(`${green("✔")} Summary complete`);
};

export default command(
  {
    name: "summary",
    parameters: ["[branch]"],
    help: {
      description:
        "Generate an AI-powered summary of changes in the current branch",
      examples: [
        "dash summary",
        "dash summary main",
        "dash summary develop",
      ],
    },
  },
  (argv) => {
    const targetBranch = argv._.branch as string | undefined;

    runSummary(targetBranch).catch((error) => {
      outro(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);

