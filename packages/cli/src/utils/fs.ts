import fs from "node:fs/promises";
import path from "node:path";

export const fileExists = (filePath: string) =>
  fs.lstat(filePath).then(
    () => true,
    () => false,
  );

export interface FindUpOptions {
  cwd?: string;
  type?: "file" | "directory";
  stopAt?: string;
}

export async function findUp(name: string, options: FindUpOptions = {}) {
  let directory = path.resolve(options.cwd ?? process.cwd());
  const { root } = path.parse(directory);
  const stopAt = path.resolve(options.stopAt ?? root);
  const isAbsoluteName = path.isAbsolute(name);

  while (directory) {
    const filePath = isAbsoluteName ? name : path.join(directory, name);
    try {
      const stats = await fs.stat(filePath);
      if (
        options.type === undefined ||
        (options.type === "file" && stats.isFile()) ||
        (options.type === "directory" && stats.isDirectory())
      )
        return filePath;
    } catch {}

    if (directory === stopAt || directory === root) break;

    directory = path.dirname(directory);
  }
}

export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}
