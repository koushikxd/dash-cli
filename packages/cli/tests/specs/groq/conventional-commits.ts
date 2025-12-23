import { describe, it, expect } from 'vitest';
import { generateCommitMessageFromSummary } from '~/utils/groq.js';
import type { ValidConfig } from '~/utils/config.js';
import { assertGroqToken, getDiff } from '../../utils.js';

const skipIfNoToken = !assertGroqToken();

const runGenerateCommitMessage = async (
	gitDiff: string,
	configOverrides: Partial<ValidConfig> = {}
): Promise<string> => {
	const config = {
		locale: 'en',
		type: 'conventional',
		generate: 1,
		'max-length': 100,
		...configOverrides,
	} as ValidConfig;

	const messages = await generateCommitMessageFromSummary(
		process.env.GROQ_API_KEY!,
		'llama-3.3-70b-versatile',
		config.locale,
		gitDiff,
		config.generate,
		config['max-length'],
		config.type,
		10000
	);

	return messages[0] || '';
};

describe('Conventional Commits', () => {
	it.skipIf(skipIfNoToken)('generates feat: for new feature', { timeout: 15000 }, async () => {
		const gitDiff = await getDiff('new-feature.diff');
		const commitMessage = await runGenerateCommitMessage(gitDiff);
		expect(commitMessage).toMatch(/(feat(\(.*\))?):/);
		console.log('Generated message:', commitMessage);
	});

	it.skipIf(skipIfNoToken)('respects max-length constraint', { timeout: 15000 }, async () => {
		const gitDiff = await getDiff('new-feature.diff');
		const maxLength = 50;
		const commitMessage = await runGenerateCommitMessage(gitDiff, {
			'max-length': maxLength,
		});
		expect(commitMessage.length).toBeLessThanOrEqual(maxLength + 5);
		console.log('Generated message:', commitMessage, 'Length:', commitMessage.length);
	});
});
