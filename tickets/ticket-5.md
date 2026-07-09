# Ticket 5 — LLM Output Types & V1 Prompt Template

**Status:** To do  
**Builds on:** Ticket 4

## Summary

Add the internal LLM output type and the versioned V1 prompt template. No LLM call is made yet — this ticket only defines the data shape and builds the prompt strings that the LLM client (Ticket 6) will send.

## Scope

### New file: `server/src/types/llmReview.ts`

Internal shape of the raw JSON the LLM is expected to return. Separate from `ReviewResponse` (the public API type) to keep the LLM contract decoupled from the API contract.

```typescript
import type { ReviewFinding } from "./reviews";

export type LlmReviewOutput = {
  summary: string;
  findings: Array<{
    category: ReviewFinding["category"];
    severity: ReviewFinding["severity"];
    confidence: ReviewFinding["confidence"];
    title: string;
    description: string;
  }>;
};
```

### New file: `server/src/prompts/v1/reviewPrompt.ts`

Exports:

```typescript
export const PROMPT_VERSION = "v1.0";

type BuildPromptInput = {
  ticketText?: string | null;
  pullRequest: PullRequestMetadata;
  diff: string;
};

type BuiltPrompt = {
  systemPrompt: string;
  userPrompt: string;
  version: string;
};

export function buildV1ReviewPrompt(input: BuildPromptInput): BuiltPrompt
```

#### System prompt instructs the model to:

- Act as a PR reviewer with access to ticket/spec text and a unified diff.
- Return **only** valid JSON matching the `LlmReviewOutput` schema — no prose outside JSON.
- Categorize each finding as one of: `requirement_gap`, `regression_risk`, `edge_case`, `implementation_concern`.
- Assign `severity` (`low | medium | high`) and `confidence` (`low | medium | high`) per finding.
- Avoid generic praise; only report actionable issues.
- When `ticketText` is absent, state clearly in the summary and scope review to diff-only risks.

#### User prompt template:

```
Ticket / spec:
{ticketText ?? "(not provided — review diff only)"}

PR metadata:
- Title: {pullRequest.title}
- Author: {pullRequest.author}
- Branch: {pullRequest.branch}
- Changed files: {pullRequest.changedFilesCount}

Unified diff:
{diff}
```

## Acceptance Criteria

- [ ] `buildV1ReviewPrompt()` returns `{ systemPrompt, userPrompt, version }` where `version === "v1.0"`
- [ ] When `ticketText` is null/undefined the user prompt contains `"(not provided — review diff only)"`
- [ ] `LlmReviewOutput` is exported from `types/llmReview.ts`
- [ ] `PROMPT_VERSION` is exported as a string constant
- [ ] No logic outside of string assembly — no I/O, no imports of LLM or GitHub modules

## Files Touched

```
server/
└── src/
    ├── types/
    │   └── llmReview.ts              # new file — LlmReviewOutput type
    └── prompts/
        └── v1/
            └── reviewPrompt.ts       # new file — buildV1ReviewPrompt(), PROMPT_VERSION
```
