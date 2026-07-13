# Ticket 9 — V2 Graph State Types & Step Output Schemas

**Status:** To do  
**Builds on:** Ticket 8

## Summary

Define the LangGraph state shape and typed LLM output schemas for V2's four intermediate steps. Step 5 (report synthesis) reuses the existing `LlmReviewOutput` type from V1. No LangGraph or LLM calls in this ticket — types and parsers only.

## Scope

### New file: `server/src/types/v2Review.ts`

Graph state and per-step output types:

```typescript
import type { PullRequestMetadata } from "../services/githubService";
import type { LlmReviewOutput } from "./llmReview";

export type TicketRequirement = {
  id: string;
  description: string;
};

export type TicketComprehensionOutput = {
  requirements: TicketRequirement[];
  acceptanceCriteria: string[];
  constraints: string[];
};

export type DiffAnalysisOutput = {
  summary: string;
  affectedFiles: string[];
  behaviorChanges: string[];
};

export type RequirementMatchOutput = {
  matched: Array<{ requirementId: string; evidence: string }>;
  gaps: Array<{ requirementId: string; description: string }>;
  partial: Array<{ requirementId: string; description: string }>;
};

export type RegressionDetectionOutput = {
  risks: Array<{ title: string; description: string; affectedArea: string }>;
};

export type V2ReviewGraphState = {
  // Inputs (set at graph start)
  ticketText: string | null;
  pullRequest: PullRequestMetadata;
  diff: string;
  wasTruncated: boolean;

  // Intermediate step outputs (populated as graph runs)
  ticketComprehension?: TicketComprehensionOutput;
  diffAnalysis?: DiffAnalysisOutput;
  requirementMatching?: RequirementMatchOutput;
  regressionDetection?: RegressionDetectionOutput;

  // Final output (step 5)
  report?: LlmReviewOutput;

  // Error state (set on step failure)
  failedStep?: string;
  errorMessage?: string;
};
```

### New file: `server/src/llm/v2/parseStepOutput.ts`

Zod validators and JSON Schema constants for steps 1–4. Step 5 re-exports `v1ReviewJsonSchema` from `parseReviewOutput.ts`.

```typescript
export function parseTicketComprehension(rawText: string): TicketComprehensionOutput;
export function parseDiffAnalysis(rawText: string): DiffAnalysisOutput;
export function parseRequirementMatching(rawText: string): RequirementMatchOutput;
export function parseRegressionDetection(rawText: string): RegressionDetectionOutput;

export const ticketComprehensionJsonSchema: object;
export const diffAnalysisJsonSchema: object;
export const requirementMatchingJsonSchema: object;
export const regressionDetectionJsonSchema: object;
```

Each parser throws `LlmParseError` (reuse from `parseReviewOutput.ts`) on invalid JSON or schema mismatch.

## Acceptance Criteria

- [ ] `V2ReviewGraphState` is exported from `types/v2Review.ts`
- [ ] All four intermediate output types are exported
- [ ] Each `parse*()` function returns typed output for valid JSON
- [ ] Each `parse*()` function throws `LlmParseError` for malformed JSON or schema mismatch
- [ ] Each `*JsonSchema` constant is exported and matches its Zod schema shape
- [ ] No LangGraph imports or graph logic in this ticket

## Testing Plan

### Unit Tests

New test file: `server/src/llm/v2/parseStepOutput.test.ts`

- `parseTicketComprehension()` returns `TicketComprehensionOutput` for valid JSON
- `parseTicketComprehension()` throws `LlmParseError` for malformed JSON
- `parseTicketComprehension()` throws `LlmParseError` when required fields are missing
- `parseDiffAnalysis()` returns `DiffAnalysisOutput` for valid JSON
- `parseDiffAnalysis()` throws `LlmParseError` for malformed JSON
- `parseRequirementMatching()` returns `RequirementMatchOutput` for valid JSON
- `parseRequirementMatching()` throws `LlmParseError` when required fields are missing
- `parseRegressionDetection()` returns `RegressionDetectionOutput` for valid JSON
- `parseRegressionDetection()` throws `LlmParseError` for malformed JSON

## Files Touched

```
server/
└── src/
    ├── types/
    │   └── v2Review.ts                   # new file — graph state + step output types
    └── llm/
        └── v2/
            └── parseStepOutput.ts        # new file — Zod parsers + JSON schemas
```
