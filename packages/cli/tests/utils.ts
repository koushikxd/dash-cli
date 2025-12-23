import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execa, execaNode, type Options } from 'execa';

const dashPath = path.resolve('./dist/index.js');

export interface TestFixture {
	path: string;
	cleanup: () => Promise<void>;
}

export const createFixture = async (files?: Record<string, string>): Promise<TestFixture> => {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dash-test-'));
	
	if (files) {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(tmpDir, filePath);
			await fs.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.writeFile(fullPath, content, 'utf8');
		}
	}

	return {
		path: tmpDir,
		cleanup: async () => {
			try {
				await fs.rm(tmpDir, { recursive: true, force: true });
			} catch {}
		},
	};
};

export const createGit = async (cwd: string) => {
	const git = (command: string, args?: string[], options?: Options) =>
		execa('git', [command, ...(args || [])], {
			cwd,
			...options,
		});

	await git('init', ['--initial-branch=master']);
	await git('config', ['user.name', 'Test User']);
	await git('config', ['user.email', 'test@example.com']);

	return git;
};

export const runDash = (
	cwd: string,
	args: string[] = [],
	options?: Options
) => {
	return execaNode(dashPath, args, {
		cwd,
		...options,
		env: {
			HOME: cwd,
			USERPROFILE: cwd,
			...options?.env,
		},
		nodeOptions: [],
	});
};

export const assertGroqToken = () => {
	if (!process.env.GROQ_API_KEY) {
		console.warn('⚠️  process.env.GROQ_API_KEY is necessary to run these tests. Skipping...');
		return false;
	}
	return true;
};

export const getDiff = async (diffName: string): Promise<string> => {
	const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', diffName);
	return fs.readFile(fixturePath, 'utf8');
};
