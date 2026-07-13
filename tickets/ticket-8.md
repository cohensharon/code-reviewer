# Ticket 8 — Shared Review Context Prep

**Status:** To do  
**Builds on:** Ticket 7

## Summary

Extract the GitHub fetch and diff-truncation steps from `runV1Review` into a shared `prepareReviewContext()` helper. V1 refactors to use it with no behavior change. V2 will reuse the same layer (PRD V2-2).

## Scope

### New file: `server/src/context/prepareReviewContext.ts`

```typescript
import type { PullRequestMetadata } from "../services/githubService";

export type ReviewContextInput = {
  prUrl: string;
};

export type ReviewContext = {
  pullRequest: PullRequestMetadata;
  diff: string;
  wasTruncated: boolean;
  originalDiffLength: number;
};

export async function prepareReviewContext(
  input: ReviewContextInput,
): Promise<ReviewContext>;
```

Steps inside `prepareReviewContext()`:

1. `parseGithubPrUrl(input.prUrl)` → parsed PR coords.
2. `Promise.all([getPullRequest(...), getPullRequestDiff(...)])` — parallel fetch.
3. `truncateDiff(rawDiff)` → `{ diff, wasTruncated, originalLength }`.
4. Return `{ pullRequest, diff, wasTruncated, originalDiffLength: originalLength }`.

Propagates `GitHubNotFoundError` and `GitHubUpstreamError` unchanged (no new error types).

### Update: `server/src/services/v1/runV1Review.ts`

Replace inline parse/fetch/truncate block with:

```typescript
const { pullRequest, diff, wasTruncated } = await prepareReviewContext({
  prUrl: input.prUrl,
});
```

All other V1 logic (prompt build, LLM call, response assembly) stays the same.

## Acceptance Criteria

- [ ] `prepareReviewContext()` returns `pullRequest`, `diff`, `wasTruncated`, and `originalDiffLength` for a valid public PR
- [ ] `runV1Review()` behavior is unchanged after refactor (same `ReviewResponse` shape and status)
- [ ] GitHub errors from context prep propagate without wrapping
- [ ] No new `console.log` introduced in `prepareReviewContext()`

## Testing Plan

### Unit Tests

New test file: `server/src/context/prepareReviewContext.test.ts`

- `prepareReviewContext()` calls `getPullRequest` and `getPullRequestDiff` with parsed URL coords (mock both)
- `prepareReviewContext()` returns truncated diff when input exceeds budget (mock diff + `truncateDiff`)
- `prepareReviewContext()` propagates `GitHubNotFoundError` when PR fetch fails
- `prepareReviewContext()` propagates `GitHubUpstreamError` when GitHub returns upstream error

Update (or add) test file: `server/src/services/v1/runV1Review.test.ts`

- `runV1Review()` still returns `status: "completed"` when context prep and LLM are mocked successfully

### Manual Testing

- Run `POST /api/reviews` with `reviewStrategy: "v1"` against a known public PR — response should match pre-refactor behavior (completed status, findings, summary)

## Files Touched

```
server/
└── src/
    ├── context/
    │   └── prepareReviewContext.ts       # new file — shared GitHub + truncation prep
    └── services/
        └── v1/
            └── runV1Review.ts            # refactor to use prepareReviewContext()
```
