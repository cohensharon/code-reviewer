# Ticket 2 — Tech Debt Cleanup & GitHub Token Support

**Status:** Done
**Builds on:** Ticket 1

## Summary

Clear the known tech debt from Ticket 1 and add `GITHUB_TOKEN` auth to the GitHub service before any new V1 features are built on top of this layer.

## Scope

### Changes

| File                                   | Change                                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/services/githubService.ts` | Remove `console.log("!!!!!!!!!!", ...)` debug line; extract `githubHeaders()` helper; read `GITHUB_TOKEN` from env and include `Authorization: Bearer` header when set |
| `server/src/utils/parseGitHubUrl.ts`   | Fix typo in error message: `"URL mus tbe from github.com"` → `"URL must be from github.com"`                                                                           |
| `server/src/services/githubService.ts` | Remove commented-out `PlaceholderPullRequest` type block                                                                                                               |
| `server/src/services/reviewService.ts` | Replace hardcoded `"placeholder-review-id"` with `crypto.randomUUID()`                                                                                                 |

### `githubHeaders()` helper (architecture spec)

```typescript
function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}
```

`getPullRequest()` switches to use `githubHeaders()` instead of the inline header object.

### Env vars introduced

| Var            | Required | Purpose                                         |
| -------------- | -------- | ----------------------------------------------- |
| `GITHUB_TOKEN` | No       | Raises GitHub rate limit from 60 to 5000 req/hr |

Add to root `.env.example`:

```
GITHUB_TOKEN=
```

## Acceptance Criteria

- [ ] `POST /api/reviews` with a valid public PR returns a UUID `reviewId` (not the placeholder string)
- [ ] No `console.log` output in terminal when the route is called
- [ ] Setting `GITHUB_TOKEN` in env causes an `Authorization` header to be sent to GitHub
- [ ] URL parse error for a non-GitHub URL reads `"URL must be from github.com"` (no typo)
- [ ] No commented-out dead code in `githubService.ts`

## Files Touched

```
server/
└── src/
    ├── services/
    │   ├── githubService.ts     # debug log removed, githubHeaders(), GITHUB_TOKEN
    │   └── reviewService.ts     # crypto.randomUUID()
    └── utils/
        └── parseGitHubUrl.ts    # typo fix
.env.example                     # GITHUB_TOKEN placeholder
```
