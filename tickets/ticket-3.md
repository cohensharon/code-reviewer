# Ticket 3 — GitHub Diff Fetch

**Status:** Done  
**Builds on:** Ticket 2

## Summary

Add `getPullRequestDiff()` to `githubService.ts` so the server can retrieve the unified diff for a PR. The diff is fetched but not yet used in the review response — that wiring happens in Ticket 7.

## Scope

### New function: `getPullRequestDiff()`

Added to `server/src/services/githubService.ts`.

```typescript
export async function getPullRequestDiff(
  input: GetPullRequestInput,
): Promise<string>;
```

- Calls `GET /repos/{owner}/{repo}/pulls/{pullNumber}` with `Accept: application/vnd.github.diff`.
- Returns the raw unified diff as a plain string.
- Reuses `githubHeaders()` from Ticket 2, overriding only the `Accept` header.
- On GitHub `404`: throw a typed error the orchestrator can map to HTTP 400.
- On GitHub `403` / `5xx`: throw a typed error the orchestrator can map to HTTP 502.

### Error typing

Introduce two typed error classes in `githubService.ts` (used by both `getPullRequest` and `getPullRequestDiff`):

```typescript
export class GitHubNotFoundError extends Error {}
export class GitHubUpstreamError extends Error {}
```

Update `getPullRequest()` to throw `GitHubNotFoundError` on `404` and `GitHubUpstreamError` on other non-ok responses (previously threw a plain `Error`).

## Acceptance Criteria

- [ ] `getPullRequestDiff()` returns a non-empty string for a known public PR
- [ ] Calling it with a non-existent PR throws `GitHubNotFoundError`
- [ ] `GitHubUpstreamError` and `GitHubNotFoundError` are exported from `githubService.ts`
- [ ] `getPullRequest()` also uses the typed errors (not plain `Error`)
- [ ] No new `console.log` introduced

## Files Touched

```
server/
└── src/
    └── services/
        └── githubService.ts    # getPullRequestDiff(), typed error classes
```
