import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { createFixture, runDash } from '../utils.js';

describe('Config', () => {
	let fixture: Awaited<ReturnType<typeof createFixture>> | null = null;

	afterEach(async () => {
		if (fixture) {
			await fixture.cleanup();
			fixture = null;
		}
	});

	it('rejects unknown config property', async () => {
		fixture = await createFixture();
		
		const result = await runDash(
			fixture.path,
			['config', 'set', 'UNKNOWN=1'],
			{ reject: false }
		);

		expect(result.stderr).toContain('Invalid config property: UNKNOWN');
	});

	it('rejects invalid GROQ_API_KEY', async () => {
		fixture = await createFixture();
		
		const result = await runDash(
			fixture.path,
			['config', 'set', 'GROQ_API_KEY=abc'],
			{ reject: false }
		);

		expect(result.stderr).toContain('Must start with "gsk_"');
	});

	it('sets and gets config', async () => {
		fixture = await createFixture();
		const groqToken = 'GROQ_API_KEY=gsk_test123';

		await runDash(fixture.path, ['config', 'set', groqToken]);

		const configPath = path.join(fixture.path, '.dash');
		const configFile = await fs.readFile(configPath, 'utf8');
		expect(configFile).toContain(groqToken);

		const getResult = await runDash(fixture.path, ['config', 'get', 'GROQ_API_KEY']);
		expect(getResult.stdout).toBe(groqToken);
	});

	it('validates timeout config', async () => {
		fixture = await createFixture();

		const invalidResult = await runDash(
			fixture.path,
			['config', 'set', 'timeout=abc'],
			{ reject: false }
		);
		expect(invalidResult.stderr).toContain('Must be an integer');

		await runDash(fixture.path, ['config', 'set', 'timeout=20000']);
		const getResult = await runDash(fixture.path, ['config', 'get', 'timeout']);
		expect(getResult.stdout).toBe('timeout=20000');
	});

	it('validates max-length config', async () => {
		fixture = await createFixture();

		const invalidResult = await runDash(
			fixture.path,
			['config', 'set', 'max-length=abc'],
			{ reject: false }
		);
		expect(invalidResult.stderr).toContain('Must be an integer');

		const tooSmallResult = await runDash(
			fixture.path,
			['config', 'set', 'max-length=10'],
			{ reject: false }
		);
		expect(tooSmallResult.stderr).toMatch(/must be greater than 20 characters/i);

		const defaultResult = await runDash(fixture.path, ['config', 'get', 'max-length']);
		expect(defaultResult.stdout).toBe('max-length=100');

		await runDash(fixture.path, ['config', 'set', 'max-length=60']);
		const getResult = await runDash(fixture.path, ['config', 'get', 'max-length']);
		expect(getResult.stdout).toBe('max-length=60');
	});
});
