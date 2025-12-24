import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan, dim, cyan, yellow, magenta } from "kolorist";
import { intro, outro, spinner } from "@clack/prompts";
import { assertGitRepo, assertGhInstalled } from "~/utils/git.js";
import { handleCliError } from "~/errors.js";

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
    },
    help: {
      description: "List repository issues",
      examples: [
        "dash issue list",
        "dash issue list --state all",
        "dash issue list --limit 10",
      ],
    },
  },
  (argv) => {
    const subcommand = argv._.subcommand;

    if (subcommand && subcommand !== "list") {
      console.error(`${red("✖")} Unknown subcommand: ${subcommand}`);
      console.log(`\nAvailable subcommands: list`);
      process.exit(1);
    }

    runIssueList(argv.flags.state, argv.flags.limit).catch((error) => {
      outro(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);

