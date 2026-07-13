# Ticket 10 — V2 Step Prompt Templates

**Status:** To do  
**Builds on:** Ticket 9

## Summary

Add versioned prompt builders for each of the five V2 agent steps. No LangGraph or LLM calls — string assembly and tests only, mirroring Ticket 5's approach for V1.

## Scope

### New file: `server/src/prompts/v2/reviewPrompts.ts`

```typescript
export const V2_PROMPT_VERSION = "v2.0";

type StepPromptInput = {
  ticketText?: string | null;
  pullRequest: PullRequestMetadata;
  diff: string;
};

type BuiltStepPrompt = {
  systemPrompt: string;
  userPrompt: string;
  version: string;
};

export function buildTicketComprehensionPrompt(input: StepPromptInput): BuiltStepPrompt;
export function buildDiffAnalysisPrompt(input: StepPromptInput): BuiltStepPrompt;
export function buildRequirementMatchingPrompt(
  input: StepPromptInput & { ticketComprehension: TicketComprehensionOutput },
): BuiltStepPrompt;
export function buildRegressionDetectionPrompt(
  input: StepPromptInput & { diffAnalysis: DiffAnalysisOutput },
): BuiltStepPrompt;
export function buildReportSynthesisPrompt(input: {
  ticketText?: string | null;
  pullRequest: PullRequestMetadata;
  ticketComprehension: TicketComprehensionOutput;
  diffAnalysis: DiffAnalysisOutput;
  requirementMatching: RequirementMatchOutput;
  regressionDetection: RegressionDetectionOutput;
}): BuiltStepPrompt;
```

#### Step 1 — Ticket comprehension

- Extract explicit requirements (with stable `id` per requirement), acceptance criteria, and constraints from ticket text.
- When `ticketText` is absent: return empty arrays and note diff-only mode in the user prompt.
- Output must match `TicketComprehensionOutput` JSON schema.

#### Step 2 — Diff analysis

- Summarize what changed, list affected files/modules, and describe behavior shifts.
- Uses PR metadata + unified diff only (no ticket comprehension input yet — focused pass).

#### Step 3 — Requirement matching

- Compare parsed requirements (from step 1) against the diff.
- Flag matched, gap, and partial implementations with requirement IDs referencing step 1.

#### Step 4 — Regression detection

- Identify regression risks, edge cases, and implicit contract breaks.
- Uses diff analysis (from step 2) + diff as primary inputs.

#### Step 5 — Report synthesis

- Merge all intermediate outputs into final `LlmReviewOutput` (same schema as V1).
- Categorize findings as: `requirement_gap`, `regression_risk`, `edge_case`, `implementation_concern`.
- Assign `severity` and `confidence` per finding.
- Avoid generic praise; only actionable issues.

All builders return `{ systemPrompt, userPrompt, version: V2_PROMPT_VERSION }`.

## Acceptance Criteria

- [ ] All five `build*Prompt()` functions are exported from `prompts/v2/reviewPrompts.ts`
- [ ] Every builder returns `version === "v2.0"`
- [ ] Step 1 user prompt contains `"(not provided — review diff only)"` when `ticketText` is null/undefined
- [ ] Step 3 user prompt includes serialized `ticketComprehension` from prior step
- [ ] Step 4 user prompt includes serialized `diffAnalysis` from prior step
- [ ] Step 5 user prompt includes all four intermediate step outputs
- [ ] No I/O, no LLM calls, no LangGraph imports

## Testing Plan

### Unit Tests

New test file: `server/src/prompts/v2/reviewPrompts.test.ts`

- `buildTicketComprehensionPrompt()` returns `version === "v2.0"`
- Step 1 user prompt contains ticket text when provided
- Step 1 user prompt contains `"(not provided — review diff only)"` when `ticketText` is null
- Step 1 user prompt contains `"(not provided — review diff only)"` when `ticketText` is undefined
- `buildDiffAnalysisPrompt()` user prompt includes PR title and diff string
- `buildRequirementMatchingPrompt()` user prompt includes `ticketComprehension` JSON
- `buildRegressionDetectionPrompt()` user prompt includes `diffAnalysis` JSON
- `buildReportSynthesisPrompt()` user prompt includes all four intermediate outputs

## Files Touched

```
server/
└── src/
    └── prompts/
        └── v2/
            └── reviewPrompts.ts          # new file — five step prompt builders
```
