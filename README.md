# CLI AI Tool Template

A production-ready CLI tool template with Groq AI integration for building intelligent command-line applications.

## Features

- 🤖 Groq AI integration for intelligent features
- ✨ TypeScript with strict mode
- 🧪 Testing with Vitest
- 📦 Package management with pnpm
- 🎯 Interactive prompts with @clack/prompts
- 🎨 Colored output with kolorist
- ⚙️ Configuration management
- 🔧 Modular command structure
- 💡 Generic AI example included

## Quick Start

### 1. Clone and Setup

```bash
# Copy this template to your project
cp -r cli-ai-template my-ai-cli-tool
cd my-ai-cli-tool

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### 2. Configure Groq API

Get your API key from [Groq Console](https://console.groq.com/keys)

```bash
# Set via environment variable (recommended)
export GROQ_API_KEY=gsk_your_api_key_here

# Or set via config command
./dist/cli.js config set GROQ_API_KEY=gsk_your_api_key_here
```

### 3. Customize

Update `package.json`:
```json
{
  "name": "@your-username/your-ai-cli-tool",
  "description": "Your AI CLI tool description",
  "bin": {
    "your-cli-name": "dist/cli.js"
  }
}
```

### 4. Development

```bash
# Watch mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
cli-ai-template/
├── src/
│   ├── commands/
│   │   ├── config.ts        # Configuration management
│   │   └── ai-example.ts    # AI example command
│   ├── utils/
│   │   ├── config.ts        # Config with AI settings
│   │   ├── error.ts         # Error handling
│   │   ├── fs.ts            # File utilities
│   │   ├── groq.ts          # Generic AI calls
│   │   └── ai-helpers.ts    # AI utility functions
│   └── cli.ts               # Main entry point
├── test/
│   └── cli.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Usage Examples

### Using the AI Assistant

```bash
# Ask a question directly
./dist/cli.js ask "What is TypeScript?"

# Interactive mode
./dist/cli.js ask

# With custom temperature (0-2)
./dist/cli.js ask "Explain AI" --temperature 0.3

# With max tokens limit
./dist/cli.js ask "Write a story" --maxTokens 500
```

### Configuration

```bash
# Set your API key
./dist/cli.js config set GROQ_API_KEY=gsk_your_key

# Set default model
./dist/cli.js config set model=llama-3.3-70b-versatile

# Set default temperature
./dist/cli.js config set temperature=0.7

# Set max tokens
./dist/cli.js config set maxTokens=2048

# Get current config
./dist/cli.js config get GROQ_API_KEY model temperature
```

## Creating AI-Powered Commands

### 1. Basic AI Command

Create `src/commands/translate.ts`:

```typescript
import { command } from "cleye";
import { spinner } from "@clack/prompts";
import { green } from "kolorist";
import { getConfig } from "../utils/config.js";
import { generateAIResponse } from "../utils/groq.js";
import { buildConversation } from "../utils/ai-helpers.js";

export default command(
  {
    name: "translate",
    parameters: ["<text>", "<targetLang>"],
  },
  async (argv) => {
    const { text, targetLang } = argv._;
    const config = await getConfig({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    });

    const s = spinner();
    s.start("Translating...");

    const systemPrompt = `You are a professional translator. Translate the given text to ${targetLang}. Return only the translation.`;
    const messages = buildConversation(systemPrompt, text);

    const result = await generateAIResponse(
      config.GROQ_API_KEY,
      config.model,
      messages,
      { temperature: 0.3 },
      config.timeout
    );

    s.stop("Translation complete");
    console.log(green("✔"), result);
  }
);
```

### 2. Advanced AI Command with Options

Create `src/commands/summarize.ts`:

```typescript
import { command } from "cleye";
import { spinner, text, isCancel } from "@clack/prompts";
import { getConfig } from "../utils/config.js";
import { generateAIResponse } from "../utils/groq.js";
import { buildConversation } from "../utils/ai-helpers.js";

export default command(
  {
    name: "summarize",
    flags: {
      length: {
        type: String,
        description: "Summary length (short/medium/long)",
        alias: "l",
        default: "medium",
      },
    },
  },
  async (argv) => {
    const inputText = await text({
      message: "Enter text to summarize:",
      validate: (v) => (v.length > 0 ? undefined : "Text required"),
    });

    if (isCancel(inputText)) return;

    const config = await getConfig({
      GROQ_API_KEY: process.env.GROQ_API_KEY,
    });

    const s = spinner();
    s.start("Summarizing...");

    const lengthMap = {
      short: "1-2 sentences",
      medium: "3-5 sentences",
      long: "1 paragraph",
    };

    const systemPrompt = `Summarize the following text in ${
      lengthMap[argv.flags.length as keyof typeof lengthMap]
    }. Be concise and capture the main points.`;

    const messages = buildConversation(systemPrompt, String(inputText));

    const summary = await generateAIResponse(
      config.GROQ_API_KEY,
      config.model,
      messages,
      { temperature: 0.5 },
      config.timeout
    );

    s.stop("Done");
    console.log("\nSummary:", summary);
  }
);
```

### 3. Register Commands

In `src/cli.ts`:

```typescript
import translateCommand from "./commands/translate.js";
import summarizeCommand from "./commands/summarize.js";

cli(
  {
    // ...
    commands: [configCommand, aiExampleCommand, translateCommand, summarizeCommand],
  },
  // ...
);
```

## AI Integration Guide

### Available Groq Models

- `llama-3.3-70b-versatile` (default) - Best for general tasks
- `llama-3.1-70b-versatile` - Alternative general-purpose
- `mixtral-8x7b-32768` - Good for longer contexts
- `gemma2-9b-it` - Faster, lighter model

### AI Configuration Options

| Option         | Type   | Default                 | Description                  |
| -------------- | ------ | ----------------------- | ---------------------------- |
| `GROQ_API_KEY` | string | -                       | Your Groq API key (required) |
| `model`        | string | llama-3.3-70b-versatile | AI model to use              |
| `temperature`  | number | 0.7                     | Randomness (0-2)             |
| `maxTokens`    | number | 1024                    | Max response length          |
| `timeout`      | number | 10000                   | API timeout (ms)             |
| `locale`       | string | en                      | Response language            |

### Using AI Utilities

```typescript
import { generateAIResponse, generateMultipleResponses } from "./utils/groq.js";
import { buildConversation, estimateTokens } from "./utils/ai-helpers.js";

// Single response
const response = await generateAIResponse(
  apiKey,
  model,
  [
    { role: "system", content: "You are helpful" },
    { role: "user", content: "Hello!" },
  ],
  { temperature: 0.7, maxTokens: 100 }
);

// Multiple responses
const responses = await generateMultipleResponses(
  apiKey,
  model,
  buildConversation("Be creative", "Write a haiku"),
  3,
  { temperature: 0.9 }
);

// Estimate tokens
const tokens = estimateTokens("Your text here");
```

## Example Use Cases

This template can be adapted for:

- 📝 **Text Generation**: Blog posts, stories, content
- 🌍 **Translation Tools**: Multi-language translation
- 📊 **Data Analysis**: Summarize and analyze data
- 💬 **Chatbots**: Conversational AI assistants
- 🎨 **Creative Tools**: Writing helpers, idea generators
- 📧 **Email Drafting**: Professional email composition
- 🔍 **Code Explanation**: Explain complex code
- 📚 **Learning Tools**: Study assistants, tutors

## Error Handling

The template includes robust error handling:

```typescript
import { KnownError, handleCliError } from "./utils/error.js";

try {
  // Your AI call
} catch (error) {
  if (error instanceof KnownError) {
    console.error(error.message);
  } else {
    handleCliError(error);
  }
  process.exit(1);
}
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

## Best Practices

1. **API Key Security**: Never commit API keys, always use environment variables
2. **Rate Limiting**: Implement delays for bulk operations
3. **Error Messages**: Provide clear, actionable error messages
4. **Prompt Engineering**: Test and refine prompts for best results
5. **Token Management**: Monitor token usage for cost control
6. **Timeouts**: Set appropriate timeouts based on expected response time

## Publishing

1. Remove example commands if not needed
2. Update version in `package.json`
3. Build: `pnpm build`
4. Publish: `npm publish --access public`

## Resources

- [Groq Documentation](https://console.groq.com/docs)
- [Groq Models](https://console.groq.com/docs/models)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

## License

MIT
