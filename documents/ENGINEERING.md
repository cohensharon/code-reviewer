# Engineering Guide

## Repository Layout

```
code-reviewer/
├── documents/          # PRD, decisions, architecture, API spec
├── tickets/            # Work tickets with scope and acceptance criteria
├── server/             # Node.js / Express / TypeScript API
│   └── src/
│       ├── index.ts
│       ├── routes/
│       ├── services/   # V1 review, GitHub, shared orchestration
│       ├── agents/     # V2 LangGraph workflow (planned)
│       ├── types/
│       └── utils/
└── client/             # Simple UI (planned)
```

## Review Strategy Architecture

Two parallel review implementations share GitHub context fetching and output types. See [DECISIONS.md](./DECISIONS.md) ADR-001.

```
POST /api/reviews
       │
       ├── reviewStrategy: "v1" (default)
       │     └── reviewService/v1 → single LLM call → ReviewResponse
       │
       └── reviewStrategy: "v2"
             └── agentWorkflow → LangGraph steps → ReviewResponse
```

### Shared Layer

| Component | Responsibility |
|-----------|----------------|
| `parseGitHubUrl` | Validate and parse PR URLs |
| `githubService` | PR metadata + unified diff fetch |
| `types/reviews.ts` | `ReviewResponse`, `ReviewFinding` schema |
| Context prep (planned) | Diff truncation, token budgeting |

### V1 — Baseline (`services/reviewService` or `services/v1/`)

- One prompt template versioned in code or config.
- LLM provider abstraction (OpenAI / Anthropic).
- Structured output parsing with schema validation.
- No graph state or step persistence.

### V2 — Agentic (`agents/` or `services/v2/`)

- LangGraph graph definition with typed state.
- One node per review step (ticket → diff → requirements → regressions → synthesis).
- Intermediate outputs stored in graph state for debugging and Weave tracing.
- Final node emits the same `ReviewFinding[]` as V1.

## Tech Stack

| Layer | Choice |
|-------|--------|
| API | Node.js, TypeScript, Express 5 |
| GitHub | REST API (`/pulls/{n}`, `/pulls/{n}` diff media type) |
| LLM | OpenAI or Anthropic (TBD) |
| Agent | LangGraph (V2 only) |
| Evaluation | W&B Weave (Epic 4) |
| UI | React or Next.js (planned) |

## Environment Variables (Planned)

```
GITHUB_TOKEN=          # Optional; raises rate limits for API calls
OPENAI_API_KEY=        # Or ANTHROPIC_API_KEY
WANDB_API_KEY=         # Weave evaluation
PORT=3000
```

## Coding Conventions

- TypeScript strict mode; shared types in `server/src/types/`.
- Services throw `Error` with user-safe messages; routes map to HTTP 400/500.
- New review strategies get their own directory; do not fold V2 into V1's `createReview` without a strategy dispatch layer.
- Prompt templates are versioned (`v1-prompt-v1.ts`) so Weave experiments can reference prompt versions.

## Testing Strategy (Planned)

- Unit tests: URL parsing, response schema validation, prompt assembly.
- Integration tests: GitHub fetch with fixtures (no live API in CI).
- Evaluation: synthetic dataset runs via Weave, not traditional unit tests.

## Current State

See [tickets/ticket-1.md](../tickets/ticket-1.md) for completed scaffold work. V1 LLM integration and diff fetch are the next engineering tasks.
