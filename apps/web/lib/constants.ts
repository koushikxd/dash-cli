import packageJson from "../../../packages/cli/package.json";

export const isProd = process.env.VERCEL_ENV === "production";
export const CLI_VERSION = packageJson.version;
