import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan, dim, cyan, yellow, magenta } from "kolorist";
import { intro, outro, spinner, text, isCancel, confirm } from "@clack/prompts";
import { assertGitRepo, assertGhInstalled } from "~/utils/git.js";
import { getConfig } from "~/utils/config.js";
import { generateIssueContent } from "~/utils/groq.js";
import { KnownError, handleCliError } from "~/errors.js";

interface IssueListItem {
  number: number;
  title: string;
  author: { login: string };
  labels: Array<{ name: string; color: string }>;
  updatedAt: string;
  url: string;
  state: string;
}

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

const formatLabels = (labels: Array<{ name: string; color: string }>): string => {
  if (labels.length === 0) return "";
  return labels.map((l) => magenta(`[${l.name}]`)).join(" ");
};

const runIssueList = async (state: string, limit: number) => {
  intro(bgCyan(black(" dash issue list ")));

  await assertGitRepo();
  await assertGhInstalled();

  const s = spinner();
  s.start(`Fetching ${state} issues`);

  try {
    const { stdout } = await execa("gh", [
      "issue",
      "list",
      "--state",
      state,
      "--json",
      "number,title,author,labels,updatedAt,url,state",
      "--limit",
      String(limit),
    ]);

    const issues: IssueListItem[] = JSON.parse(stdout);
    s.stop(`Found ${issues.length} ${state} issue${issues.length !== 1 ? "s" : ""}`);

    if (issues.length === 0) {
      outro(`No ${state} issues found`);
      return;
    }

    console.log("");
    for (const issue of issues) {
      const date = new Date(issue.updatedAt);
      const relativeTime = getRelativeTime(date);
      const labels = formatLabels(issue.labels);

      const stateColor = issue.state === "OPEN" ? green : red;
      console.log(`${stateColor(`#${issue.number}`)} ${issue.title} ${labels}`);
      console.log(`   ${dim(`by ${issue.author.login} • ${relativeTime}`)}`);
      console.log(`   ${dim(issue.url)}\n`);
    }

    outro(`${dim("Showing")} ${issues.length} ${dim("issues")}`);
  } catch (error) {
    s.stop("Failed to fetch issues");
    if (error instanceof Error && error.message.includes("not a git repository")) {
      throw error;
    }
    console.error(`${red("✖")} Failed to list issues`);
    if (error instanceof Error) {
      console.error(dim(error.message));
    }
    process.exit(1);
  }
};

const runIssueCreate = async (label?: string) => {
  intro(bgCyan(black(" dash issue create ")));

  await assertGitRepo();
  await assertGhInstalled();

  const description = await text({
    message: "Describe the issue",
    placeholder: "e.g., Login page crashes when submitting empty form",
    validate: (value) => {
      if (!value || value.trim().length < 5) {
        return "Description must be at least 5 characters";
      }
    },
  });

  if (isCancel(description)) {
    outro("Issue creation cancelled");
    return;
  }

  const { env } = process;
  const config = await getConfig({
    GROQ_API_KEY: env.GROQ_API_KEY,
    proxy:
      env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY,
  });

  const s = spinner();
  s.start("Generating issue with AI");

  let title: string;
  let body: string;
  try {
    const result = await generateIssueContent(
      config.GROQ_API_KEY,
      config.model,
      description as string,
      config.timeout,
      config.proxy
    );
    title = result.title;
    body = result.body;
  } catch {
    s.stop("Failed to generate issue");
    throw new KnownError("Failed to generate issue content. Please try again.");
  }

  s.stop("Issue generated");

  console.log("");
  console.log(`${cyan("Title:")} ${title}`);
  console.log("");
  console.log(dim("─".repeat(60)));
  console.log(body);
  console.log(dim("─".repeat(60)));
  console.log("");

  const shouldCreate = await confirm({
    message: "Create this issue on GitHub?",
  });

  if (isCancel(shouldCreate) || !shouldCreate) {
    outro("Issue creation cancelled");
    return;
  }

  s.start("Creating issue on GitHub");

  try {
    const args = [
      "issue",
      "create",
      "--title",
      title,
      "--body",
      body,
    ];

    if (label) {
      args.push("--label", label);
    }

    const { stdout } = await execa("gh", args);
    s.stop("Issue created");

    console.log("");
    console.log(`${green("✔")} ${dim(stdout)}`);

    outro(`${green("✔")} Issue created successfully`);
  } catch (error) {
    s.stop("Failed to create issue");
    console.error(`${red("✖")} Failed to create issue on GitHub`);
    if (error instanceof Error) {
      console.error(dim(error.message));
    }
    process.exit(1);
  }
};

export default command(
  {
    name: "issue",
    parameters: ["[subcommand]"],
    flags: {
      state: {
        type: String,
        description: "Filter by state (open, closed, all)",
        alias: "s",
        default: "open",
      },
      limit: {
        type: Number,
        description: "Maximum number of issues to show",
        alias: "l",
        default: 20,
      },
      label: {
        type: String,
        description: "Label to add when creating an issue",
      },
    },
    help: {
      description: "Create and list repository issues",
      examples: [
        "dash issue create",
        "dash issue create --label bug",
        "dash issue list",
        "dash issue list --state all",
        "dash issue list --limit 10",
      ],
    },
    ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
  },
  (argv) => {
    const subcommand = argv._.subcommand;

    if (subcommand === "create") {
      runIssueCreate(argv.flags.label).catch((error) => {
        outro(`${red("✖")} ${error.message}`);
        handleCliError(error);
        process.exit(1);
      });
      return;
    }

    if (!subcommand || subcommand === "list") {
      runIssueList(argv.flags.state, argv.flags.limit).catch((error) => {
        outro(`${red("✖")} ${error.message}`);
        handleCliError(error);
        process.exit(1);
      });
      return;
    }

    console.error(`${red("✖")} Unknown subcommand: ${subcommand}`);
    console.log(`\nAvailable subcommands: create, list`);
    process.exit(1);
  }
);
