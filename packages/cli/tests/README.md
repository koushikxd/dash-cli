# Test Suite

This directory contains the test suite for the Dash CLI tool.

## Overview

The tests are written using **Vitest** and cover the following areas:

### Test Structure

- `tests/utils.ts` - Shared test utilities and fixtures
- `tests/specs/cli/error-cases.ts` - Error handling tests
- `tests/specs/config.ts` - Configuration management tests
- `tests/specs/groq/conventional-commits.ts` - AI commit message generation tests

## Running Tests

```bash
npm run test
```

## Test Coverage

### CLI Error Cases (2 tests)
- ✅ Fails on non-Git project
- ✅ Fails on no staged files

### Config Management (5 tests)
- ✅ Rejects unknown config properties
- ✅ Validates GROQ_API_KEY format
- ✅ Sets and gets config values
- ✅ Validates timeout config
- ✅ Validates max-length config

### Conventional Commits (2 tests - requires GROQ_API_KEY)
- ⏭️ Generates feat: for new features (skipped without API key)
- ⏭️ Respects max-length constraint (skipped without API key)

## Environment Variables

### Optional
- `GROQ_API_KEY` - Required to run AI-powered commit message generation tests

When `GROQ_API_KEY` is not set, those tests will be automatically skipped.

## Test Utilities

The test suite provides several helper functions:

- `createFixture(files?)` - Creates a temporary test directory
- `createGit(cwd)` - Initializes a git repository in a directory
- `runDash(cwd, args, options)` - Executes the Dash CLI
- `assertGroqToken()` - Checks if GROQ_API_KEY is available
- `getDiff(diffName)` - Loads fixture diff files

## Adding New Tests

1. Create a new test file in `tests/specs/`
2. Import test utilities from `../utils.js` or `../../utils.js`
3. Use Vitest's `describe`, `it`, and `expect` APIs
4. For async operations, use `await` inside async test functions
5. Use `afterEach` to cleanup fixtures

Example:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { createFixture, runDash } from '../utils.js';

describe('My Feature', () => {
  let fixture: Awaited<ReturnType<typeof createFixture>> | null = null;

  afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = null;
    }
  });

  it('should do something', async () => {
    fixture = await createFixture({ 'test.txt': 'content' });
    const result = await runDash(fixture.path, ['command']);
    expect(result.exitCode).toBe(0);
  });
});
```

## Notes

- Tests run in isolated temporary directories
- All fixtures are automatically cleaned up after each test
- Tests are configured to use threads pool for better performance
- The test suite has been migrated from `manten` to Vitest for better compatibility

