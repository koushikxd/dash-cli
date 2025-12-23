import { execa } from "execa";
import { KnownError } from "~/errors.js";

export const assertGitRepo = async () => {
  const { stdout, failed } = await execa(
    "git",
    ["rev-parse", "--show-toplevel"],
    { reject: false }
  );

  if (failed) {
    throw new KnownError("The current directory must be a Git repository!");
  }

  return stdout;
};

const excludeFromDiff = (path: string) => `:(exclude)${path}`;

const filesToExclude = [
  "package-lock.json",
  "node_modules/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  ".nyc_output/**",
  "*.log",
  "*.tmp",
  "*.temp",
  "*.cache",
  ".DS_Store",
  "Thumbs.db",
  "*.min.js",
  "*.min.css",
  "*.bundle.js",
  "*.bundle.css",
  "*.lock",
].map(excludeFromDiff);

export const getStagedDiff = async (excludeFiles?: string[]) => {
  const diffCached = ["diff", "--cached", "--diff-algorithm=minimal"];
  const { stdout: files } = await execa("git", [
    ...diffCached,
    "--name-only",
    ...filesToExclude,
    ...(excludeFiles ? excludeFiles.map(excludeFromDiff) : []),
  ]);

  if (!files) {
    return;
  }

  const { stdout: diff } = await execa("git", [
    ...diffCached,
    ...filesToExclude,
    ...(excludeFiles ? excludeFiles.map(excludeFromDiff) : []),
  ]);

  return {
    files: files.split("\n"),
    diff,
  };
};

export const getDetectedMessage = (files: string[]) =>
  `Detected ${files.length.toLocaleString()} staged file${
    files.length > 1 ? "s" : ""
  }`;

export const estimateTokenCount = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const chunkDiff = (diff: string, maxTokens: number = 4000): string[] => {
  const estimatedTokens = estimateTokenCount(diff);

  if (estimatedTokens <= maxTokens) {
    return [diff];
  }

  const chunks: string[] = [];
  const lines = diff.split("\n");
  let currentChunk = "";
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokenCount(line);

    if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line + "\n";
      currentTokens = lineTokens;
    } else {
      currentChunk += line + "\n";
      currentTokens += lineTokens;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

export const getDiffSummary = async (excludeFiles?: string[]) => {
  const diffCached = ["diff", "--cached", "--diff-algorithm=minimal"];
  const { stdout: files } = await execa("git", [
    ...diffCached,
    "--name-only",
    ...filesToExclude,
    ...(excludeFiles ? excludeFiles.map(excludeFromDiff) : []),
  ]);

  if (!files) {
    return null;
  }

  const fileList = files.split("\n").filter(Boolean);

  const fileStats = await Promise.all(
    fileList.map(async (file) => {
      try {
        const { stdout: stat } = await execa("git", [
          ...diffCached,
          "--numstat",
          "--",
          file,
        ]);
        const [additions, deletions] = stat
          .split("\t")
          .slice(0, 2)
          .map(Number);
        return {
          file,
          additions: additions || 0,
          deletions: deletions || 0,
          changes: (additions || 0) + (deletions || 0),
        };
      } catch {
        return { file, additions: 0, deletions: 0, changes: 0 };
      }
    })
  );

  return {
    files: fileList,
    fileStats,
    totalChanges: fileStats.reduce((sum, stat) => sum + stat.changes, 0),
  };
};

export const splitDiffByFile = (diff: string): string[] => {
  const parts: string[] = [];
  let current = "";
  const lines = diff.split("\n");
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current.trim().length > 0) parts.push(current.trim());
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }
  if (current.trim().length > 0) parts.push(current.trim());
  return parts;
};

export const buildCompactSummary = async (
  excludeFiles?: string[],
  maxFiles: number = 20
) => {
  const summary = await getDiffSummary(excludeFiles);
  if (!summary) return null;
  const { fileStats } = summary;
  const sorted = [...fileStats].sort((a, b) => b.changes - a.changes);
  const top = sorted.slice(0, Math.max(1, maxFiles));
  const totalFiles = summary.files.length;
  const totalChanges = summary.totalChanges;
  const totalAdditions = fileStats.reduce((s, f) => s + (f.additions || 0), 0);
  const totalDeletions = fileStats.reduce((s, f) => s + (f.deletions || 0), 0);

  const lines: string[] = [];
  lines.push(`Files changed: ${totalFiles}`);
  lines.push(
    `Additions: ${totalAdditions}, Deletions: ${totalDeletions}, Total changes: ${totalChanges}`
  );
  lines.push("Top files by changes:");
  for (const f of top) {
    lines.push(
      `- ${f.file} (+${f.additions} / -${f.deletions}, ${f.changes} changes)`
    );
  }
  if (sorted.length > top.length) {
    lines.push(`…and ${sorted.length - top.length} more files`);
  }

  return lines.join("\n");
};

export interface Commit {
  hash: string;
  message: string;
  body: string;
}

export const getCurrentBranch = async (): Promise<string> => {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
};

export const getBaseBranch = async (): Promise<string> => {
  const { stdout: remotes } = await execa("git", ["remote"]);
  const remote = remotes.split("\n")[0]?.trim() || "origin";

  for (const branch of ["main", "master", "develop"]) {
    try {
      await execa("git", ["rev-parse", "--verify", `${remote}/${branch}`], {
        reject: true,
      });
      return branch;
    } catch {
      continue;
    }
  }

  try {
    const { stdout } = await execa("git", [
      "symbolic-ref",
      `refs/remotes/${remote}/HEAD`,
    ]);
    const defaultBranch = stdout.trim().replace(`refs/remotes/${remote}/`, "");
    return defaultBranch;
  } catch {
    return "main";
  }
};

export const getCommitsSinceBase = async (
  baseBranch: string
): Promise<Commit[]> => {
  const { stdout: remotes } = await execa("git", ["remote"]);
  const remote = remotes.split("\n")[0]?.trim() || "origin";

  try {
    const { stdout } = await execa("git", [
      "log",
      `${remote}/${baseBranch}..HEAD`,
      "--pretty=format:%H|||%s|||%b---COMMIT_END---",
    ]);

    if (!stdout.trim()) {
      return [];
    }

    const commits = stdout
      .split("---COMMIT_END---")
      .filter((c) => c.trim())
      .map((entry) => {
        const [hash, message, ...bodyParts] = entry.trim().split("|||");
        return {
          hash: hash || "",
          message: message || "",
          body: bodyParts.join("|||").trim(),
        };
      })
      .filter((c) => c.hash && c.message);

    return commits;
  } catch {
    return [];
  }
};

export const assertGhInstalled = async (): Promise<void> => {
  try {
    await execa("gh", ["--version"]);
  } catch {
    throw new KnownError(
      "GitHub CLI (gh) is not installed or not in PATH.\n" +
        "Install it from: https://cli.github.com/"
    );
  }
};

export const assertNotOnBaseBranch = async (
  currentBranch: string,
  baseBranch: string
): Promise<void> => {
  if (
    currentBranch === baseBranch ||
    currentBranch === "main" ||
    currentBranch === "master"
  ) {
    throw new KnownError(
      `Cannot create PR from ${currentBranch} branch.\n` +
        "Please switch to a feature branch first."
    );
  }
};

export const getDiffStatsSinceBase = async (
  baseBranch: string
): Promise<{ files: number; insertions: number; deletions: number }> => {
  const { stdout: remotes } = await execa("git", ["remote"]);
  const remote = remotes.split("\n")[0]?.trim() || "origin";

  try {
    const { stdout } = await execa("git", [
      "diff",
      "--shortstat",
      `${remote}/${baseBranch}...HEAD`,
    ]);

    const filesMatch = stdout.match(/(\d+) files? changed/);
    const insertionsMatch = stdout.match(/(\d+) insertions?\(\+\)/);
    const deletionsMatch = stdout.match(/(\d+) deletions?\(-\)/);

    return {
      files: filesMatch ? parseInt(filesMatch[1], 10) : 0,
      insertions: insertionsMatch ? parseInt(insertionsMatch[1], 10) : 0,
      deletions: deletionsMatch ? parseInt(deletionsMatch[1], 10) : 0,
    };
  } catch {
    return { files: 0, insertions: 0, deletions: 0 };
  }
};

