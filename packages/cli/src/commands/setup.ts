import { command } from "cleye";
import { execa } from "execa";
import { black, green, red, bgCyan, cyan, dim, yellow } from "kolorist";
import { intro, outro, confirm, isCancel } from "@clack/prompts";
import { setConfigs, getConfig } from "~/utils/config.js";
import { handleCliError } from "~/errors.js";

const checkGhInstalled = async (): Promise<boolean> => {
  try {
    await execa("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
};

const checkGhAuthenticated = async (): Promise<boolean> => {
  try {
    await execa("gh", ["auth", "status"]);
    return true;
  } catch {
    return false;
  }
};

const runSetup = async () => {
  intro(bgCyan(black(" dash setup ")));

  const ghInstalled = await checkGhInstalled();

  if (!ghInstalled) {
    console.log(`\n${yellow("⚠")} GitHub CLI (gh) is not installed.\n`);
    console.log(`${dim("Some features require gh CLI:")}`);
    console.log(`  ${dim("•")} dash pr create/list/view/merge`);
    console.log(`  ${dim("•")} dash issue list\n`);
    console.log(`${dim("Install from:")} ${cyan("https://cli.github.com/")}\n`);

    const enableWithoutGh = await confirm({
      message: "Continue without gh CLI? (commit and hook commands will work)",
    });

    if (isCancel(enableWithoutGh) || !enableWithoutGh) {
      outro("Setup cancelled. Install gh CLI and run setup again.");
      return;
    }

    await setConfigs([["gh_enabled", "false"]]);
    outro(`${green("✔")} Setup complete. gh-dependent features disabled.`);
    return;
  }

  console.log(`\n${green("✔")} GitHub CLI is installed\n`);

  const ghAuthenticated = await checkGhAuthenticated();
  if (!ghAuthenticated) {
    console.log(`${yellow("⚠")} GitHub CLI is not authenticated.\n`);
    console.log(`${dim("Run:")} ${cyan("gh auth login")}\n`);

    const continueAnyway = await confirm({
      message: "Continue setup? (you'll need to authenticate before using PR features)",
    });

    if (isCancel(continueAnyway) || !continueAnyway) {
      outro("Setup cancelled. Authenticate gh CLI and run setup again.");
      return;
    }
  } else {
    console.log(`${green("✔")} GitHub CLI is authenticated\n`);
  }

  const enableGh = await confirm({
    message: "Enable gh CLI features? (PR creation, listing, merging, issues)",
    initialValue: true,
  });

  if (isCancel(enableGh)) {
    outro("Setup cancelled");
    return;
  }

  await setConfigs([["gh_enabled", enableGh ? "true" : "false"]]);

  const config = await getConfig({}, true);
  const hasApiKey = !!config.GROQ_API_KEY;

  if (!hasApiKey) {
    console.log(`\n${yellow("⚠")} Groq API key not configured.\n`);
    console.log(`${dim("Get your API key from:")} ${cyan("https://console.groq.com/keys")}`);
    console.log(`${dim("Then run:")} ${cyan("dash config set GROQ_API_KEY=gsk_...")}\n`);
  }

  console.log(`\n${dim("Configuration:")}`);
  console.log(`  ${dim("•")} gh CLI features: ${enableGh ? green("enabled") : yellow("disabled")}`);
  console.log(`  ${dim("•")} Groq API key: ${hasApiKey ? green("configured") : yellow("not set")}\n`);

  outro(`${green("✔")} Setup complete!`);
};

export default command(
  {
    name: "setup",
    help: {
      description: "Configure dash CLI and check dependencies",
    },
  },
  () => {
    runSetup().catch((error) => {
      outro(`${red("✖")} ${error.message}`);
      handleCliError(error);
      process.exit(1);
    });
  }
);

