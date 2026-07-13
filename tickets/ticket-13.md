# Ticket 13 — V2 Orchestrator & Route Integration

**Status:** To do  
**Builds on:** Ticket 12

## Summary

Expose V2 on `POST /api/reviews` via `reviewStrategy: "v2"`. Replace the `NotImplementedError` stub with `runV2Review()`. Map V2 failed reviews to HTTP 200 with `status: "failed"` in the body. Update orchestrator and route tests.

Completes Epic 2 (PRD V2-1 through V2-6).

## Scope

### Update: `server/src/services/reviewOrchestrator.ts`

```typescript
import { runV2Review } from "./v2/runV2Review";

export async function orchestrateReview(input: CreateReviewInput): Promise<ReviewResponse> {
  const strategy = input.reviewStrategy ?? "v1";

  if (strategy === "v1") {
    return runV1Review(input);
  }

  if (strategy === "v2") {
    return runV2Review(input);
  }

  throw new NotImplementedError(`Review strategy "${strategy}" is not supported`);
}
```

Remove the blanket `NotImplementedError` for all non-`v1` strategies.

### Update: `server/src/routes/reviewRoutes.ts`

- Return HTTP **200** for both `status: "completed"` and `status: "failed"` V2 reviews (failed is a valid review outcome, not a transport error).
- Keep existing error mapping for thrown errors (GitHub, LLM upstream during unrecoverable failures, parse errors from V1, etc.).
- Remove `NotImplementedError` → 501 mapping for `reviewStrategy: "v2"` (retain 501 only for unknown strategy values).

| Outcome | HTTP |
|---------|------|
| `status: "completed"` | 200 |
| `status: "failed"` (V2 step failure) | 200 |
| URL parse error / missing `prUrl` | 400 |
| `GitHubNotFoundError` | 400 |
| `GitHubUpstreamError` | 502 |
| `LlmUpstreamError` (uncaught, e.g. V1) | 502 |
| `LlmParseError` (uncaught, e.g. V1) | 400 |
| Unknown `reviewStrategy` | 501 |
| Unhandled exception | 500 |

## API behavior after this ticket

**Request:**

```json
{
  "prUrl": "https://github.com/org/repo/pull/123",
  "ticketText": "Users must not submit empty forms.",
  "reviewStrategy": "v2"
}
```

**Response — completed (`200`):**

```json
{
  "reviewId": "<uuid>",
  "status": "completed",
  "input": { "prUrl": "...", "ticketText": "..." },
  "pullRequest": { "title": "...", "author": "...", "branch": "...", "changedFilesCount": 3 },
  "findings": [{ "id": "<uuid>", "category": "requirement_gap", "severity": "high", "confidence": "medium", "title": "...", "description": "..." }],
  "summary": "..."
}
```

**Response — failed (`200`):**

```json
{
  "reviewId": "<uuid>",
  "status": "failed",
  "input": { "prUrl": "...", "ticketText": "..." },
  "pullRequest": { "title": "...", "author": "...", "branch": "...", "changedFilesCount": 3 },
  "findings": [],
  "summary": null,
  "error": { "step": "requirementMatching", "message": "Failed to parse LLM output: ..." }
}
```

## Acceptance Criteria

- [ ] `POST /api/reviews` with `reviewStrategy: "v2"` returns HTTP 200 and `status: "completed"` for a valid public PR with `OPENAI_API_KEY` set
- [ ] `reviewStrategy: "v2"` returns HTTP 200 with `status: "failed"` and `error.step` when a graph step fails
- [ ] `reviewStrategy` defaults to `"v1"` when omitted — V1 behavior unchanged
- [ ] Unknown `reviewStrategy` (e.g. `"v3"`) returns HTTP 501
- [ ] V2 response shape matches `ReviewResponse` (same fields as V1 + optional `error`)
- [ ] `orchestrateReview()` no longer throws `NotImplementedError` for `"v2"`

## Testing Plan

### Unit Tests

Update: `server/src/services/reviewOrchestrator.test.ts`

- `orchestrateReview()` calls `runV2Review` when `reviewStrategy` is `"v2"` (mock `runV2Review`)
- `orchestrateReview()` throws `NotImplementedError` when `reviewStrategy` is an unknown value (e.g. `"v3"`)
- Remove or update the test expecting `NotImplementedError` for `"v2"`

Update: `server/src/routes/reviewRoutes.test.ts`

- `reviewStrategy: "v2"` with mocked completed response returns HTTP 200 and `status: "completed"`
- `reviewStrategy: "v2"` with mocked failed response returns HTTP 200 and `status: "failed"` with `error` object
- Unknown `reviewStrategy` maps to HTTP 501
- Existing V1 error-mapping tests still pass

### Manual Testing

- `POST /api/reviews` with `reviewStrategy: "v2"` against a known public PR — verify `status: "completed"`, categorized findings, and summary
- Run the same PR with `reviewStrategy: "v1"` — compare output shape (both should return identical `ReviewResponse` structure)
- Verify terminal logs show per-step entries (`ticketComprehension`, `diffAnalysis`, etc.) plus a final review summary line
- Optionally simulate a step failure (e.g. temporarily break a step schema) and confirm HTTP 200 with `status: "failed"` and actionable `error.step`

## Files Touched

```
server/
└── src/
    ├── routes/
    │   └── reviewRoutes.ts               # V2 200 for failed status, remove v2→501
    └── services/
        ├── reviewOrchestrator.ts         # dispatch v2 → runV2Review
        └── v2/
            └── runV2Review.ts            # consumed by orchestrator
```
