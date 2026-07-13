# Ticket 11 — LangGraph Workflow Graph

**Status:** To do  
**Builds on:** Ticket 10

## Summary

Install LangGraph and implement the five-node review workflow as a stateful graph. Each node calls `completeStructured()` with its step-specific prompt and JSON schema, parses output, and writes to graph state. No HTTP route changes — graph is invoked only from tests and a thin `runV2Graph()` export.

## Scope

### Dependency

```bash
npm install @langchain/langgraph @langchain/core
```

Use `@langchain/langgraph` for graph definition. Reuse existing `completeStructured()` from `llmClient.ts` inside node handlers (no LangChain LLM wrapper required).

### New file: `server/src/services/v2/reviewGraph.ts`

```typescript
import type { V2ReviewGraphState } from "../../types/v2Review";

export type RunV2GraphInput = {
  ticketText?: string | null;
  pullRequest: PullRequestMetadata;
  diff: string;
  wasTruncated: boolean;
};

export type RunV2GraphResult =
  | { status: "completed"; state: V2ReviewGraphState }
  | { status: "failed"; state: V2ReviewGraphState; failedStep: string; errorMessage: string };

export async function runV2Graph(input: RunV2GraphInput): Promise<RunV2GraphResult>;
```

#### Graph nodes (sequential)

| Node | Prompt builder | Parser | State field written |
|------|----------------|--------|---------------------|
| `ticketComprehension` | `buildTicketComprehensionPrompt` | `parseTicketComprehension` | `ticketComprehension` |
| `diffAnalysis` | `buildDiffAnalysisPrompt` | `parseDiffAnalysis` | `diffAnalysis` |
| `requirementMatching` | `buildRequirementMatchingPrompt` | `parseRequirementMatching` | `requirementMatching` |
| `regressionDetection` | `buildRegressionDetectionPrompt` | `parseRegressionDetection` | `regressionDetection` |
| `reportSynthesis` | `buildReportSynthesisPrompt` | `parseReviewOutput` | `report` |

Edges: `ticketComprehension → diffAnalysis → requirementMatching → regressionDetection → reportSynthesis → END`.

#### Step failure handling (in-graph)

- On `LlmUpstreamError` or `LlmParseError` inside a node: set `failedStep` and `errorMessage` on state, short-circuit to END.
- Return `{ status: "failed", failedStep, errorMessage, state }`.
- Do **not** throw from `runV2Graph()` for step failures — caller decides HTTP mapping.

#### Step logging (V2-5)

After each successful node, log a structured JSON line:

```json
{
  "step": "ticketComprehension",
  "promptVersion": "v2.0",
  "status": "completed",
  "latencyMs": 1200
}
```

Do **not** log diff, ticket text, or full step output payloads (metadata only).

## Acceptance Criteria

- [ ] `runV2Graph()` executes all five nodes in order when all LLM calls succeed
- [ ] Final state contains `report` with `summary` and `findings` on success
- [ ] `LlmParseError` in any node returns `{ status: "failed", failedStep, errorMessage }` without throwing
- [ ] `LlmUpstreamError` in any node returns `{ status: "failed", failedStep, errorMessage }` without throwing
- [ ] A structured log line is emitted per completed step (step name, promptVersion, latencyMs)
- [ ] No changes to `reviewOrchestrator` or routes in this ticket

## Testing Plan

### Unit Tests

New test file: `server/src/services/v2/reviewGraph.test.ts`

- `runV2Graph()` runs five nodes in order and returns `status: "completed"` when all LLM calls are mocked successfully
- `runV2Graph()` returns `status: "failed"` with `failedStep: "ticketComprehension"` when step 1 LLM throws `LlmParseError`
- `runV2Graph()` returns `status: "failed"` with `failedStep: "diffAnalysis"` when step 2 LLM throws `LlmUpstreamError`
- `runV2Graph()` returns `status: "failed"` with `failedStep: "reportSynthesis"` when step 5 output fails schema validation
- Final state `report` is populated on successful run (mock all five `completeStructured` responses)

Mock `completeStructured` via `vi.mock("../../llm/llmClient")` — do not call OpenAI in unit tests.

### Manual Testing

- None required for this ticket (graph not yet wired to HTTP).

## Files Touched

```
server/
├── package.json                          # @langchain/langgraph, @langchain/core added
└── src/
    └── services/
        └── v2/
            └── reviewGraph.ts            # new file — LangGraph workflow
```
