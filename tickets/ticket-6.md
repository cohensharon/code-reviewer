# Ticket 6 — LLM Client & Output Parser

**Status:** Done
**Builds on:** Ticket 5

## Summary

Add the OpenAI LLM client and the Zod-based output parser. After this ticket every V1 building block exists; Ticket 7 wires them into the live request pipeline.

## Scope

### New file: `server/src/llm/llmClient.ts`

Thin provider abstraction. V1 calls OpenAI Chat Completions with structured output (`response_format: json_schema`).

```typescript
type CompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: object; // JSON Schema object for structured output
};

type CompletionResult = {
  rawText: string;
  model: string;
  promptVersion: string;
};

export async function completeStructured(
  request: CompletionRequest,
  promptVersion: string,
): Promise<CompletionResult>;
```

- Reads `OPENAI_API_KEY` from env (throws a clear startup error if absent).
- Reads `OPENAI_MODEL` from env; defaults to `"gpt-4o-mini"`.
- Calls `POST https://api.openai.com/v1/chat/completions` with `response_format: { type: "json_schema", json_schema: { ... } }`.
- Returns `rawText` (the model's message content string), `model` (echoed from response), and `promptVersion` (passed through).
- On non-200 from OpenAI: throw `LlmUpstreamError` (new typed error, exported).

```typescript
export class LlmUpstreamError extends Error {}
```

Install the `openai` npm package; use the official SDK rather than raw fetch.

### New file: `server/src/llm/parseReviewOutput.ts`

Parses and validates the raw JSON string from the LLM against the `LlmReviewOutput` schema using Zod.

```typescript
import { LlmReviewOutput } from "../types/llmReview";

export function parseReviewOutput(rawText: string): LlmReviewOutput;
```

1. `JSON.parse(rawText)` — catch parse errors.
2. Validate with a Zod schema mirroring `LlmReviewOutput`.
3. On any failure: throw `LlmParseError` (new typed error, exported).

```typescript
export class LlmParseError extends Error {}
```

No `id` field is assigned here — IDs are added by the orchestrator in Ticket 7.

### JSON Schema constant

Export a `v1ReviewJsonSchema` constant from `parseReviewOutput.ts` (or a shared schema file) for passing to `completeStructured`. This is the JSON Schema representation of `LlmReviewOutput` used in the OpenAI `response_format`.

### Env vars introduced

| Var              | Required | Default        | Purpose               |
| ---------------- | -------- | -------------- | --------------------- |
| `OPENAI_API_KEY` | Yes      | —              | OpenAI authentication |
| `OPENAI_MODEL`   | No       | `gpt-5.4-mini` | Model override        |

Add to `.env.example`:

```
OPENAI_API_KEY=
OPENAI_MODEL=
```

### Dependency

```bash
npm install openai
```

## Acceptance Criteria

- [ ] `completeStructured()` returns a `CompletionResult` when given a valid system + user prompt and a real `OPENAI_API_KEY`
- [ ] Missing `OPENAI_API_KEY` at startup throws a clear error (not a cryptic 401)
- [ ] `parseReviewOutput()` returns `LlmReviewOutput` for a valid JSON string matching the schema
- [ ] `parseReviewOutput()` throws `LlmParseError` for invalid JSON or schema mismatch
- [ ] `LlmUpstreamError` and `LlmParseError` are exported
- [ ] `v1ReviewJsonSchema` is exported and matches the `LlmReviewOutput` shape

## Unit Tests

New test file: `server/src/llm/parseReviewOutput.test.ts`

- `parseReviewOutput()` returns `LlmReviewOutput` for a valid JSON string
- `parseReviewOutput()` throws `LlmParseError` for malformed JSON
- `parseReviewOutput()` throws `LlmParseError` when required fields are missing
- `parseReviewOutput()` throws `LlmParseError` when `severity` is not a valid enum value
- `parseReviewOutput()` throws `LlmParseError` when `confidence` is not a valid enum value

New test file: `server/src/llm/llmClient.test.ts`

- `completeStructured()` throws `LlmUpstreamError` when OpenAI returns a non-200 response (mock fetch)

## Files Touched

```
server/
├── package.json                      # openai dependency added
└── src/
    └── llm/
        ├── llmClient.ts              # new file — completeStructured(), LlmUpstreamError
        └── parseReviewOutput.ts      # new file — parseReviewOutput(), LlmParseError, v1ReviewJsonSchema
```
