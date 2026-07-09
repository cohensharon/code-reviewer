# Ticket 7 — V1 Orchestrator & Full Pipeline Wire-Up

**Status:** To do  
**Builds on:** Ticket 6

## Summary

Wire every V1 building block into a live, end-to-end review pipeline. After this ticket `POST /api/reviews` returns real findings from the LLM, `status` is `"completed"`, and the route maps all typed errors to the correct HTTP status codes. `reviewService.ts` is retired.

## Scope

### New file: `server/src/services/v1/runV1Review.ts`

V1 pipeline orchestration. Runs all steps in order:

```typescript
export async function runV1Review(input: CreateReviewInput): Promise<ReviewResponse>
```

Steps:
1. `parseGithubPrUrl(input.prUrl)` → parsed PR coords.
2. `Promise.all([getPullRequest(...), getPullRequestDiff(...)])` — parallel fetch.
3. `truncateDiff(rawDiff)` → `{ diff, wasTruncated, originalLength }`.
4. `buildV1ReviewPrompt({ ticketText, pullRequest, diff })` → `{ systemPrompt, userPrompt, version }`.
5. `completeStructured({ systemPrompt, userPrompt, responseSchema: v1ReviewJsonSchema }, version)` → `{ rawText, model, promptVersion }`.
6. `parseReviewOutput(rawText)` → `{ summary, findings }`.
7. Assign `id` to each finding: `crypto.randomUUID()` (or `finding-${n}` as fallback).
8. Log: `reviewId`, `prUrl`, `promptVersion`, `model`, `wasTruncated`, finding count, elapsed ms. Do **not** log diff or ticket text.
9. Return `ReviewResponse` with `status: "completed"`.

### New file: `server/src/services/reviewOrchestrator.ts`

Single entry point for strategy dispatch:

```typescript
export type CreateReviewInput = {
  prUrl: string;
  ticketText?: string;
  reviewStrategy?: "v1" | "v2";
};

export async function orchestrateReview(input: CreateReviewInput): Promise<ReviewResponse>
```

- Defaults `reviewStrategy` to `"v1"` when absent.
- `"v1"` → `runV1Review(input)`.
- `"v2"` → throws `NotImplementedError` (new typed error); route maps to HTTP 501.
- Generates no `reviewId` here — `runV1Review` owns it.

### Update: `server/src/routes/reviewRoutes.ts`

- Accept `reviewStrategy` from request body.
- Call `orchestrateReview({ prUrl, ticketText, reviewStrategy })` instead of `createReview()`.
- Expand error mapping:

| Error type | HTTP |
|-----------|------|
| URL parse error / missing `prUrl` | 400 |
| `GitHubNotFoundError` | 400 |
| `GitHubUpstreamError` | 502 |
| `LlmUpstreamError` | 502 |
| `LlmParseError` | 400 |
| `NotImplementedError` (v2 stub) | 501 |
| Unhandled exception | 500 |

Remove the import of `createReview` from the route.

### Retire: `server/src/services/reviewService.ts`

Delete the file. All callers now go through `reviewOrchestrator`.

## API behavior after this ticket

**Request:**
```json
{
  "prUrl": "https://github.com/org/repo/pull/123",
  "ticketText": "Users must not submit empty forms.",
  "reviewStrategy": "v1"
}
```

**Response (`200`):**
```json
{
  "reviewId": "<uuid>",
  "status": "completed",
  "input": { "prUrl": "...", "ticketText": "..." },
  "pullRequest": { "title": "...", "author": "...", "branch": "...", "changedFilesCount": 3 },
  "findings": [
    {
      "id": "<uuid>",
      "category": "requirement_gap",
      "severity": "high",
      "confidence": "medium",
      "title": "...",
      "description": "..."
    }
  ],
  "summary": "..."
}
```

## Acceptance Criteria

- [ ] `POST /api/reviews` with a valid public PR and `OPENAI_API_KEY` set returns `status: "completed"` and non-empty `findings`
- [ ] `reviewId` is a UUID (not a placeholder string)
- [ ] Each finding has a unique `id`
- [ ] `reviewStrategy` defaults to `"v1"` when omitted from the request
- [ ] `reviewStrategy: "v2"` returns HTTP 501
- [ ] GitHub 404 returns HTTP 400; GitHub upstream error returns HTTP 502
- [ ] LLM provider error returns HTTP 502; LLM parse failure returns HTTP 400
- [ ] `reviewService.ts` is deleted
- [ ] Terminal shows a structured log line per review (reviewId, prUrl, promptVersion, wasTruncated, finding count, latency)

## Files Touched

```
server/
└── src/
    ├── routes/
    │   └── reviewRoutes.ts                  # reviewStrategy, orchestrateReview(), full error map
    ├── services/
    │   ├── reviewService.ts                 # deleted
    │   ├── reviewOrchestrator.ts            # new file — strategy dispatch
    │   └── v1/
    │       └── runV1Review.ts               # new file — V1 pipeline
```
