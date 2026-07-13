# Ticket 12 — V2 Review Pipeline (`runV2Review`)

**Status:** To do  
**Builds on:** Ticket 11

## Summary

Wire shared context prep and the LangGraph workflow into `runV2Review()` — the V2 equivalent of `runV1Review()`. Returns a `ReviewResponse` with `status: "completed"` or `status: "failed"`. Not yet exposed on the HTTP route (Ticket 13).

## Scope

### Update: `server/src/types/reviews.ts`

Extend `ReviewResponse` for failed reviews:

```typescript
export type ReviewResponse = {
  reviewId: string;
  status: "received" | "completed" | "failed";
  input: { prUrl: string; ticketText: string | null };
  pullRequest: { ... };
  findings: ReviewFinding[];
  summary: string | null;
  error?: { step: string; message: string };  // present when status === "failed"
};
```

### New file: `server/src/services/v2/runV2Review.ts`

```typescript
export async function runV2Review(input: {
  prUrl: string;
  ticketText?: string;
}): Promise<ReviewResponse>;
```

Pipeline steps:

1. `reviewId = crypto.randomUUID()`.
2. `prepareReviewContext({ prUrl })` → `{ pullRequest, diff, wasTruncated }`.
3. `runV2Graph({ ticketText, pullRequest, diff, wasTruncated })`.
4. On graph `status: "completed"`:
   - Parse `state.report` via existing `parseReviewOutput` shape (already validated in graph).
   - Assign `id` to each finding via `crypto.randomUUID()`.
   - Log summary line: `reviewId`, `prUrl`, `promptVersion: "v2.0"`, `wasTruncated`, `findingCount`, `elapsedMs`, token metrics aggregated across steps.
   - Return `ReviewResponse` with `status: "completed"`.
5. On graph `status: "failed"`:
   - Log summary line with `failedStep` and `errorMessage` (no diff/ticket text).
   - Return `ReviewResponse` with `status: "failed"`, `findings: []`, `summary: null`, `error: { step, message }`.

Do **not** throw for graph step failures — return the failed `ReviewResponse` (PRD V2-6).

GitHub errors from `prepareReviewContext()` still propagate (thrown, not caught).

## Acceptance Criteria

- [ ] `runV2Review()` returns `status: "completed"` with findings when graph succeeds (mocked)
- [ ] `runV2Review()` returns `status: "failed"` with `error.step` and `error.message` when graph fails (mocked)
- [ ] Each finding has a unique `id` on completed reviews
- [ ] `reviewId` is a UUID
- [ ] GitHub errors propagate without wrapping
- [ ] Structured log line emitted per review (completed or failed)
- [ ] `reviewOrchestrator` still routes `"v2"` to `NotImplementedError` (updated in Ticket 13)

## Testing Plan

### Unit Tests

New test file: `server/src/services/v2/runV2Review.test.ts`

- `runV2Review()` returns `status: "completed"` with non-empty findings when context prep and graph are mocked successfully
- `runV2Review()` returns `status: "failed"` with `error.step` when graph returns failed status
- `runV2Review()` assigns UUID `id` to each finding
- `runV2Review()` propagates `GitHubNotFoundError` from context prep
- `runV2Review()` propagates `GitHubUpstreamError` from context prep

Mock `prepareReviewContext` and `runV2Graph` — no live GitHub or OpenAI calls.

### Manual Testing

- None required for this ticket (not yet on HTTP route).

## Files Touched

```
server/
└── src/
    ├── types/
    │   └── reviews.ts                    # add optional error field to ReviewResponse
    └── services/
        └── v2/
            ├── reviewGraph.ts            # consumed by runV2Review
            └── runV2Review.ts          # new file — V2 pipeline orchestration
```
