# Ticket 1 — Server Scaffold & Review API Skeleton

**Status:** Done  
**Completed:** Manual setup prior to 2026-07-08

## Summary

Initial backend scaffold for the Code Review Assistant: Express server, review API route, GitHub PR URL parsing, GitHub metadata fetch, and shared TypeScript types for structured review output. The review endpoint accepts input and returns a placeholder response — no diff fetch, no LLM call yet.

This ticket establishes the API contract and GitHub integration foundation that V1 and V2 will build on.

## Scope

### Implemented

| Area | Details |
|------|---------|
| **Project bootstrap** | `server/` package with TypeScript, Express 5, `ts-node-dev` for local dev (`npm run dev`) |
| **HTTP server** | `server/src/index.ts` — Express app on port 3000, JSON body parser, `/health` endpoint |
| **Review route** | `POST /api/reviews` — accepts `prUrl` (required), `ticketText` (optional); validates `prUrl` presence |
| **URL parsing** | `server/src/utils/parseGitHubUrl.ts` — validates `github.com` host, `/owner/repo/pull/{n}` path, positive integer PR number |
| **GitHub service** | `server/src/services/githubService.ts` — `getPullRequest()` fetches PR metadata via GitHub REST API (title, author, branch, changed file count) |
| **Review service** | `server/src/services/reviewService.ts` — `createReview()` orchestrates parse → GitHub fetch → placeholder response |
| **Types** | `server/src/types/reviews.ts` — `ReviewFinding` (category, severity, confidence) and `ReviewResponse` schema |
| **Docs** | Root `README.md` with curl example for the review endpoint |

### Not Implemented (Deferred to V1+)

- GitHub unified diff fetch
- LLM API integration
- Prompt templates
- Actual findings generation (`findings` always `[]`, `summary` always `null`)
- `reviewStrategy` parameter (V1/V2 dispatch)
- GitHub token auth / rate-limit handling
- UI client
- Tests
- LangGraph / Weave

## File Map

```
server/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                 # Express app entry
    ├── routes/
    │   └── reviewRoutes.ts      # POST /api/reviews
    ├── services/
    │   ├── githubService.ts     # getPullRequest()
    │   └── reviewService.ts     # createReview() — placeholder
    ├── types/
    │   └── reviews.ts           # ReviewResponse, ReviewFinding
    └── utils/
        └── parseGitHubUrl.ts    # parseGithubPrUrl()
```

## API Behavior (Current)

**Request:**

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/my-org/my-repo/pull/123",
    "ticketText": "User should not be able to submit an empty form."
  }'
```

**Response (placeholder):**

```json
{
  "reviewId": "placeholder-review-id",
  "status": "received",
  "input": {
    "prUrl": "https://github.com/my-org/my-repo/pull/123",
    "ticketText": "User should not be able to submit an empty form."
  },
  "pullRequest": {
    "title": "...",
    "author": "...",
    "branch": "...",
    "changedFilesCount": 0
  },
  "findings": [],
  "summary": null
}
```

Errors return `{ "errors": ["..."] }` with HTTP 400 for invalid URLs or missing `prUrl`.

## Acceptance Criteria

- [x] Server starts with `npm run dev` and responds on port 3000
- [x] `GET /health` returns `{ "status": "ok" }`
- [x] `POST /api/reviews` requires `prUrl` and returns 400 if missing
- [x] Valid GitHub PR URLs are parsed into owner, repo, pull number
- [x] Invalid URLs return descriptive 400 errors
- [x] PR metadata is fetched from GitHub API for valid public PRs
- [x] Response shape matches `ReviewResponse` type with empty findings placeholder
- [x] `ReviewFinding` categories defined for future LLM output: `requirement_gap`, `regression_risk`, `edge_case`, `implementation_concern`

## Known Gaps / Tech Debt

- `reviewId` is hardcoded (`"placeholder-review-id"`); should be UUID or trace ID
- `status: "received"` should become `"completed"` once LLM review runs
- `getPullRequest` logs debug output (`console.log("!!!!!!!!!!", ...)`) — remove before V1
- No `GITHUB_TOKEN`; unauthenticated API calls hit lower rate limits
- Typo in parse error message: `"URL mus tbe from github.com"`
- Commented-out `PlaceholderPullRequest` type in `githubService.ts` — clean up or use

## Next Ticket

**V1 — Baseline reviewer:** Add diff fetch, LLM call, prompt engineering, and structured findings population. See `documents/PRD.md` Version 1 requirements.
