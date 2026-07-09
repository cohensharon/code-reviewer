# Architecture

System design for the Code Review Assistant. This document is version-scoped: **V1 is fully specified**; V2 and V3 are outlined with placeholders to fill in when those phases start.

Related docs: [PRD.md](./PRD.md), [DECISIONS.md](./DECISIONS.md) (ADR-001: V1/V2 coexistence), [ENGINEERING.md](./ENGINEERING.md) (conventions).

---

## Version Roadmap

| Version | Name | Status | Summary |
|---------|------|--------|---------|
| **V1** | Baseline reviewer | In progress | Single-shot LLM: ticket + diff → structured findings |
| **V2** | Agentic reviewer | Planned | LangGraph multi-step workflow; same output schema as V1 |
| **V3** | Evaluation & observability | Planned | Synthetic dataset, W&B Weave strategy comparison, tracing |
| *V4+* | *Productization* | *Deferred* | *Auth, review persistence, multi-user — discuss when V1–V3 are stable* |

V1 and V2 are **parallel implementations** behind a shared API. V3 consumes both. See ADR-001.

---

## System Context (V1)

```
┌─────────────┐     POST /api/reviews      ┌──────────────────────────────────┐
│   Client    │ ─────────────────────────► │  Express API (server/src)        │
│  (curl/UI)  │ ◄───────────────────────── │                                  │
└─────────────┘     ReviewResponse (JSON)  └──────────┬───────────────────────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        ▼                             ▼                             ▼
               ┌────────────────┐           ┌─────────────────┐           ┌─────────────────┐
               │  GitHub REST   │           │  Context prep   │           │  LLM provider   │
               │  API           │           │  (truncation)   │           │  (single call)  │
               └────────────────┘           └─────────────────┘           └─────────────────┘
```

V1 is a **synchronous, stateless** request/response pipeline. No database, no job queue, no session store. Each review is independent.

---

## V1 — Baseline Reviewer

### Purpose

Establish the simplest end-to-end review path and the permanent **control case** for later comparison against V2 and evaluation in V3.

### Pipeline

```
POST /api/reviews { prUrl, ticketText?, reviewStrategy?: "v1" }
  │
  ├─ 1. Validate request (route)
  ├─ 2. Parse GitHub PR URL (parseGitHubUrl)                    [done — Ticket 1]
  ├─ 3. Fetch PR metadata (githubService.getPullRequest)        [done — Ticket 1]
  ├─ 4. Fetch unified diff (githubService.getPullRequestDiff)   [planned]
  ├─ 5. Prepare context (truncateDiffToBudget)                  [planned]
  ├─ 6. Build prompt (prompts/v1/reviewPrompt)                  [planned]
  ├─ 7. Call LLM once (llm/llmClient)                           [planned]
  ├─ 8. Parse & validate output (llm/parseReviewOutput)         [planned]
  └─ 9. Return ReviewResponse { status: "completed", ... }      [partial — Ticket 1]
```

### Target Module Layout

Refactor from the Ticket 1 scaffold toward clear boundaries. V2 will add `agents/` later without touching `v1/`.

```
server/src/
├── index.ts
├── routes/
│   └── reviewRoutes.ts          # HTTP validation, error mapping
├── services/
│   ├── reviewOrchestrator.ts    # reviewStrategy dispatch (v1 default; v2 stub)
│   ├── githubService.ts         # metadata + diff fetch (shared with V2)
│   └── v1/
│       └── runV1Review.ts       # V1 pipeline orchestration
├── llm/
│   ├── llmClient.ts             # Provider abstraction, single completion call
│   └── parseReviewOutput.ts     # JSON parse + schema validation
├── prompts/
│   └── v1/
│       └── reviewPrompt.ts      # Versioned system + user prompt templates
├── context/
│   └── truncateDiff.ts          # Token/char budget enforcement
├── types/
│   ├── reviews.ts               # ReviewResponse, ReviewFinding (API contract)
│   └── llmReview.ts             # Raw LLM output shape (internal)
└── utils/
    └── parseGitHubUrl.ts
```

**Migration from Ticket 1:** Move logic out of `services/reviewService.ts` into `reviewOrchestrator.ts` + `services/v1/runV1Review.ts`. Keep `createReview` as a thin export or remove after cutover.

### Component Responsibilities

#### `routes/reviewRoutes.ts`

- Accept `POST /api/reviews` with body `{ prUrl, ticketText?, reviewStrategy? }`.
- Validate `prUrl` is present.
- Default `reviewStrategy` to `"v1"`.
- Delegate to `reviewOrchestrator`.
- Map errors to HTTP status:
  - **400** — invalid URL, missing fields, GitHub 404, LLM output failed schema validation
  - **502** — GitHub API unavailable, LLM provider error (transient upstream)
  - **500** — unexpected internal errors

#### `services/reviewOrchestrator.ts`

- Single entry point for all review strategies.
- Switch on `reviewStrategy`:
  - `"v1"` → `runV1Review()`
  - `"v2"` → throw `not implemented` until V2 ships (or 501)
- Generates `reviewId` via `crypto.randomUUID()` at the start of each run.

#### `utils/parseGitHubUrl.ts` *(exists)*

- Parse `https://github.com/{owner}/{repo}/pull/{n}`.
- Throw descriptive errors for malformed input.

#### `services/githubService.ts` *(extend)*

| Function | GitHub endpoint | Notes |
|----------|-----------------|-------|
| `getPullRequest()` *(exists)* | `GET /repos/{o}/{r}/pulls/{n}` | Returns title, author, branch, changedFilesCount |
| `getPullRequestDiff()` *(new)* | `GET /repos/{o}/{r}/pulls/{n}` with `Accept: application/vnd.github.diff` | Returns unified diff as plain text |

Shared GitHub fetch helper:

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

Diff fetch uses `Accept: application/vnd.github.diff` instead of the JSON accept header.

Errors from GitHub (`404`, `403` rate limit) are wrapped in typed errors the orchestrator can map to HTTP responses.

#### `context/truncateDiff.ts` *(new)*

V1 uses **hard truncation** to stay within a configurable character budget. No pre-summarization LLM call in V1.

| Config | Default | Env override |
|--------|---------|--------------|
| Max diff characters | `80_000` | `MAX_DIFF_CHARS` |

Strategy:

1. If diff length ≤ budget, pass through unchanged.
2. If over budget, keep the first 70% and last 20% of the budget, insert a `[... diff truncated ...]` marker, drop the middle.
3. Attach metadata internally (truncated: boolean, originalLength) for logging; not exposed in API response for V1.

Rationale: simple, deterministic, no extra LLM cost. V2 or V3 may add smarter context selection.

#### `prompts/v1/reviewPrompt.ts` *(new)*

Versioned prompt template. Export a constant `PROMPT_VERSION = "v1.0"` for traceability.

**System message** instructs the model to:

- Act as a PR reviewer with access to ticket/spec text and a unified diff.
- Return **only** valid JSON matching the expected schema.
- Categorize each finding into one of: `requirement_gap`, `regression_risk`, `edge_case`, `implementation_concern`.
- Assign `severity` and `confidence` per finding.
- Avoid generic praise; only report actionable issues.
- State clearly when ticket text is missing and scope review to diff-only risks.

**User message** contains:

```
Ticket / spec:
{ticketText || "(not provided — review diff only)"}

PR metadata:
- Title: {title}
- Author: {author}
- Branch: {branch}
- Changed files: {changedFilesCount}

Unified diff:
{truncatedDiff}
```

#### `llm/llmClient.ts` *(new)*

Thin provider abstraction. V1 needs one method:

```typescript
type CompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: object;  // JSON schema for structured output
};

type CompletionResult = {
  rawText: string;
  model: string;
  promptVersion: string;
};

async function completeStructured(request: CompletionRequest): Promise<CompletionResult>
```

**Provider choice (V1):** OpenAI Chat Completions with `response_format: { type: "json_schema", ... }`. Anthropic can be added behind the same interface later.

Configuration:

| Env var | Required | Purpose |
|---------|----------|---------|
| `OPENAI_API_KEY` | Yes (V1) | LLM authentication |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `GITHUB_TOKEN` | No | Raises GitHub rate limits |
| `MAX_DIFF_CHARS` | No | Diff truncation budget |
| `PORT` | No | Default `3000` |

#### `llm/parseReviewOutput.ts` *(new)*

1. Parse JSON from LLM response.
2. Validate against Zod schema mirroring `ReviewFinding` + summary fields.
3. Assign `id` to each finding (`crypto.randomUUID()` or `finding-{n}`) if the model omits them.
4. On validation failure: throw a parse error → route returns 400 with `"LLM returned invalid review format"`.

Internal LLM output shape (`types/llmReview.ts`):

```typescript
type LlmReviewOutput = {
  summary: string;
  findings: Array<{
    category: ReviewFinding["category"];
    severity: ReviewFinding["severity"];
    confidence: ReviewFinding["confidence"];
    title: string;
    description: string;
  }>;
};
```

#### `services/v1/runV1Review.ts` *(new)*

Orchestrates the V1 pipeline. Pseudocode:

```typescript
export async function runV1Review(input: CreateReviewInput): Promise<ReviewResponse> {
  const reviewId = crypto.randomUUID();
  const parsedPr = parseGithubPrUrl(input.prUrl);

  const [pullRequest, rawDiff] = await Promise.all([
    getPullRequest(parsedPr),
    getPullRequestDiff(parsedPr),
  ]);

  const { diff, wasTruncated } = truncateDiff(rawDiff);
  const { systemPrompt, userPrompt, version } = buildV1ReviewPrompt({
    ticketText: input.ticketText,
    pullRequest,
    diff,
  });

  const llmResult = await completeStructured({
    systemPrompt,
    userPrompt,
    responseSchema: v1ReviewJsonSchema,
  });

  const { summary, findings } = parseReviewOutput(llmResult.rawText);

  return {
    reviewId,
    status: "completed",
    input: { prUrl: input.prUrl, ticketText: input.ticketText ?? null },
    pullRequest,
    findings,
    summary,
  };
}
```

### API Contract (V1)

**Request:**

```json
{
  "prUrl": "https://github.com/org/repo/pull/123",
  "ticketText": "Users must not submit empty forms.",
  "reviewStrategy": "v1"
}
```

`reviewStrategy` defaults to `"v1"` when omitted.

**Success response (`200`):**

```json
{
  "reviewId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "input": { "prUrl": "...", "ticketText": "..." },
  "pullRequest": { "title": "...", "author": "...", "branch": "...", "changedFilesCount": 3 },
  "findings": [
    {
      "id": "finding-1",
      "category": "requirement_gap",
      "severity": "high",
      "confidence": "medium",
      "title": "Empty form validation missing",
      "description": "..."
    }
  ],
  "summary": "The PR partially addresses the ticket but does not validate empty submissions."
}
```

**Error response (`4xx/5xx`):**

```json
{ "errors": ["Invalid github PR URL"] }
```

### Error Handling

| Failure | `status` in body | HTTP |
|---------|------------------|------|
| Invalid URL / missing prUrl | — | 400 |
| GitHub PR not found | — | 400 |
| GitHub rate limit / auth | — | 502 |
| LLM provider error | — | 502 |
| LLM output fails schema validation | — | 400 |
| Unhandled exception | — | 500 |

V1 does not return `status: "failed"` in the body for partial failures — the request either succeeds with `completed` or fails with an HTTP error. The `"failed"` status value is reserved for V2 async/step failures.

### Observability (V1 — minimal)

V1 logging only; no Weave integration yet (that is V3).

- Log `reviewId`, `prUrl`, `promptVersion`, `wasTruncated`, finding count, latency ms.
- Do **not** log full diff or ticket text in production logs (may contain sensitive content).
- Remove debug `console.log` from `githubService.ts` (Ticket 1 tech debt).

### V1 Implementation Status

| Component | Status |
|-----------|--------|
| Express server + `/health` | Done |
| `POST /api/reviews` route | Done (placeholder response) |
| `parseGitHubUrl` | Done |
| `getPullRequest` | Done |
| `getPullRequestDiff` | Not started |
| `truncateDiff` | Not started |
| `prompts/v1/reviewPrompt` | Not started |
| `llm/llmClient` | Not started |
| `llm/parseReviewOutput` | Not started |
| `reviewOrchestrator` + `v1/runV1Review` | Not started |
| `reviewStrategy` dispatch | Not started |
| Real `reviewId` + `status: "completed"` | Not started |

### V1 Non-Goals

- LangGraph or multi-step reasoning
- Async/background review jobs
- Review persistence or retrieval by ID
- User authentication
- W&B Weave tracing
- UI (may follow as a thin client over this API)

---

## V2 — Agentic Reviewer

// TODO: LangGraph graph definition and typed state shape
// TODO: Node breakdown — ticket comprehension, diff analysis, requirement matching, regression detection, report synthesis
// TODO: Conditional routing (e.g. skip regression pass for docs-only diffs)
// TODO: Intermediate state logging for debugging
// TODO: `services/v2/runV2Review.ts` entry point; wire into `reviewOrchestrator` via `reviewStrategy: "v2"`
// TODO: Reuse `githubService`, `context/truncateDiff`, `types/reviews.ts` unchanged
// TODO: Failure semantics — per-step errors, `status: "failed"` in response body
// TODO: Prompt templates per graph node (`prompts/v2/`)

### Constraints (from ADR-001)

- V2 lives in `server/src/agents/` (or `services/v2/`); must not replace V1 code.
- Output schema must match V1 exactly (`ReviewResponse`, `ReviewFinding`).
- Same API input; only `reviewStrategy` changes.

---

## V3 — Evaluation & Observability

// TODO: Synthetic PR dataset format — fixture location, schema for labeled expected findings
// TODO: Dataset entries — PR ref or embedded diff, ticket text, known issue labels, difficulty tags
// TODO: W&B Weave integration — trace decorator on V1 and V2 runners
// TODO: Evaluation runner — batch script that invokes both strategies per dataset row
// TODO: Strategy labels — `v1`, `v2`, `diff_only` (ticket omitted)
// TODO: Metrics — detection rate, false positive rate, hallucination rate, category accuracy
// TODO: Experiment comparison dashboard in Weave
// TODO: Optional diff-only baseline as a third strategy variant (prompt flag, not a new version)
// TODO: CI integration — run eval on prompt/agent changes (threshold gating TBD)

### Relationship to V1 / V2

V3 does not change the review API contract. It wraps existing runners, adds tracing, and compares outputs against labeled ground truth.

---

## Future — V4+ Productization

*Deferred — not in scope for V1–V3 architecture.*

Likely direction: authenticated users, persisted review history, optional GitHub OAuth for private repos. Discuss after V1 ships and V2/V3 evaluation validates the core review value.

// TODO: Auth model (API keys vs GitHub OAuth vs session)
// TODO: Storage (reviews table, user ↔ review association)
// TODO: Async review for large PRs (job queue)
// TODO: Review retrieval — `GET /api/reviews/:id`
