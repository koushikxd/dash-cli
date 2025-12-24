import { cli } from "cleye";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import commitCommand from "~/commands/commit.js";
import prCommand from "~/commands/pr.js";
import issueCommand from "~/commands/issue.js";
import configCommand from "~/commands/config.js";
import modelCommand from "~/commands/model.js";
import hookCommand, { isCalledFromGitHook } from "~/commands/hook.js";
import setupCommand from "~/commands/setup.js";
import prepareCommitMessageHook from "~/commands/prepare-commit-msg-hook.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf8")
);
const { description, version } = packageJson;

const rawArgv = process.argv.slice(2);

if (isCalledFromGitHook) {
  prepareCommitMessageHook();
} else {
  cli(
    {
      name: "dash",
      version,
      commands: [commitCommand, prCommand, issueCommand, configCommand, modelCommand, hookCommand, setupCommand],
      help: {
        description,
      },
      ignoreArgv: (type) => type === "unknown-flag" || type === "argument",
    },
    (argv) => {
      argv.showHelp();
    },
    rawArgv
  );
}
