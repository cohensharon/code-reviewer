# PRD — Code Review Assistant

## Overview

An AI-assisted PR review system that analyzes GitHub diffs against ticket/spec context to surface requirement gaps, regressions, edge cases, and implementation concerns. The product ships in two review implementations (V1 baseline, V2 agentic) so their outputs can be compared on a shared synthetic dataset using W&B Weave.

## Problem

Human PR reviews often miss issues because reviewers lack ticket context, are overloaded, or focus only on changed lines. Generic diff-only AI review produces shallow or generic comments. This project tests whether structured ticket-aware review — and whether a multi-step agent workflow — improves detection of spec mismatches and regressions.

## Goals

1. Accept a GitHub PR URL and ticket/spec text; return a structured, categorized review report.
2. Ship two review strategies (single-shot LLM vs. LangGraph agent) behind a common API contract.
3. Build a small synthetic PR dataset with known issues for controlled evaluation.
4. Compare strategies with W&B Weave using detection rate, false positives, and finding quality.

## Non-Goals (V1 / V2)

- Automatic GitHub PR commenting
- Enterprise auth or multi-tenant deployment
- Full repo indexing or semantic code search
- Model fine-tuning
- Product UI, auth, persistence, or shareable review URLs (see Epic 5)

---

## Version 1 — Baseline Reviewer (MVP)

**Maps to:** Epic 1 — Baseline PR Review Flow

**Purpose:** Establish the simplest end-to-end path and the **control case** for later strategy comparison. V1 is not a throwaway prototype; it remains in the codebase as a permanent baseline.

### Description

V1 is a single-shot LLM review pipeline. The user submits a GitHub PR URL and ticket/spec text. The backend fetches PR metadata and the unified diff from the GitHub API, assembles a prompt containing ticket context and diff content, calls an LLM API once, and parses the response into a structured review report.

No agent orchestration, no multi-pass reasoning, no LangGraph. Quality depends on prompt engineering and output schema enforcement (JSON mode / structured output).

### User Flow

1. User provides PR URL and ticket text (API or simple UI form).
2. Backend validates URL, fetches PR metadata and diff.
3. Backend builds a single prompt: ticket requirements + diff + review instructions.
4. Backend calls LLM API once.
5. Response is parsed into categorized findings with severity and confidence.
6. Structured `ReviewResponse` is returned to the client.

### Functional Requirements

| ID | Requirement |
|----|-------------|
| V1-1 | Accept `prUrl` (required) and `ticketText` (optional but recommended) via `POST /api/reviews`. |
| V1-2 | Parse and validate GitHub PR URLs (`https://github.com/{owner}/{repo}/pull/{n}`). |
| V1-3 | Fetch PR metadata (title, author, branch, changed file count) from GitHub REST API. |
| V1-4 | Fetch unified diff for the PR from GitHub REST API. |
| V1-5 | Truncate or summarize diff when it exceeds a configurable token budget. |
| V1-6 | Call LLM API with a versioned prompt template combining ticket text and diff. |
| V1-7 | Parse LLM output into `ReviewFinding[]` with categories: `requirement_gap`, `regression_risk`, `edge_case`, `implementation_concern`. |
| V1-8 | Each finding includes `severity`, `confidence`, `title`, and `description`. |
| V1-9 | Return `ReviewResponse` with `status: "completed"` and a short `summary` when successful. |
| V1-10 | Support `reviewStrategy: "v1"` (or default) on the review endpoint to select this path. |

### Output Schema

Findings use the shared `ReviewResponse` / `ReviewFinding` types (see `server/src/types/reviews.ts`). V1 and V2 must produce comparable output shapes so evaluation can diff strategies apples-to-apples.

### Success Criteria

- End-to-end review completes for synthetic PRs in the curated dataset.
- Structured JSON output validates against the schema without manual cleanup.
- Review latency is acceptable for small PRs (< 60s for diffs under token budget).
- Output is usable as the **baseline** in Weave evaluation runs.

### Out of Scope for V1

- LangGraph or multi-step agent workflow
- W&B Weave integration (Epic 4)
- Synthetic dataset authoring (Epic 3) — consumed later, not built in V1
- Web UI, auth, or review persistence (Epic 5)

---

## Version 2 — Agentic Reviewer

**Maps to:** Epic 2 — Agentic Review Workflow

**Purpose:** The multi-step AI-assisted review agent — a LangGraph workflow that decomposes review into distinct reasoning steps. V2 runs **alongside** V1, not in place of it.

### Description

V2 converts the baseline into a multi-step LangGraph workflow. Instead of one monolithic prompt, the agent performs sequential (and potentially conditional) passes: understand the ticket, inspect the diff, match requirements, detect regressions, and synthesize a final report. Each step has a focused prompt and intermediate state, which should reduce generic comments and improve categorization — but that hypothesis is what the evaluation pipeline must prove.

### User Flow

Same input as V1 (PR URL + ticket text). The caller selects `reviewStrategy: "v2"` (or equivalent). The backend fetches the same GitHub context, then runs the LangGraph workflow instead of a single LLM call.

### Agent Steps (LangGraph Nodes)

| Step | Responsibility |
|------|----------------|
| 1. Ticket comprehension | Extract explicit requirements, acceptance criteria, and constraints from ticket text. |
| 2. Diff analysis | Summarize what changed, which files/modules are affected, and what behavior may have shifted. |
| 3. Requirement matching | Compare ticket requirements against the diff; flag missing or partial implementations. |
| 4. Regression detection | Identify changes that may break existing behavior, edge cases, or implicit contracts. |
| 5. Report synthesis | Merge step outputs into final `ReviewFinding[]` and executive `summary`. |

Steps may share state (e.g., parsed requirements from step 1 feed step 3). The graph can add lightweight routing (e.g., skip deep regression pass for docs-only diffs) in a later iteration.

### Functional Requirements

| ID | Requirement |
|----|-------------|
| V2-1 | Implement LangGraph workflow with the five steps above (or documented equivalent decomposition). |
| V2-2 | Reuse the same GitHub fetch and context-prep layer as V1. |
| V2-3 | Produce the same `ReviewResponse` / `ReviewFinding` schema as V1. |
| V2-4 | Expose via `reviewStrategy: "v2"` on the review endpoint (or a dedicated route that shares types). |
| V2-5 | Log intermediate step outputs for debugging and Weave trace correlation. |
| V2-6 | Handle step failures gracefully; return `status: "failed"` with actionable error detail. |

### Success Criteria

- Agent completes full workflow on synthetic PRs without manual intervention.
- Findings are categorized and structured consistently with V1 output.
- Side-by-side runs on the same PR + ticket show measurable differences in detection (evaluated in Epic 4).

### Out of Scope for V2

- Replacing or removing V1 implementation
- New output categories beyond the shared schema (extend schema for both if needed)

---

## Evaluation & Dataset (Post-V1/V2)

**Maps to:** Epic 3 — Synthetic PR Dataset, Epic 4 — W&B Weave Evaluation

Not part of V1 or V2 deliverables, but required to meet the project's evaluation goals.

### Synthetic Dataset (Epic 3)

- Small curated set of synthetic PRs with **known** issues: missing requirements, bad edge-case handling, regressions, and harmless changes.
- Each entry includes: PR reference (or fixture diff), ticket text, and labeled expected findings.

### Weave Evaluation (Epic 4)

- Run V1, V2, and optionally diff-only (no ticket) strategies across the dataset.
- Track: detection rate on known issues, false positive rate, hallucination rate, category accuracy.
- Compare whether ticket context and multi-step agent review improve metrics over baseline.

---

## Productization

**Maps to:** Epic 5 — Web App, Auth & Review History

**Purpose:** Turn the review API into a usable product: a web frontend, lightweight email-code authentication, and persisted reviews so users can return to past results via stable URLs.

Epic 5 is separate from the V1/V2 evaluation work (Epics 1–4). It can be built in parallel once the review API is stable, but is not required to compare review strategies.

### Description

A simple web app lets signed-in users submit PR URL + ticket text, pick a review strategy, and view structured findings. Reviews are stored in a database and scoped to the authenticated user. Each completed review has a stable URL (e.g. `/reviews/{reviewId}`) for revisiting or sharing within the app.

Authentication uses **email code** (passwordless): user enters email → receives a one-time code → verifies code → receives a session. No passwords, OAuth, or enterprise SSO in this epic.

### User Flow

1. User visits the app and signs in with email + one-time code.
2. User submits a new review (PR URL, ticket text, optional strategy).
3. App shows a loading state while the backend runs the review pipeline.
4. On completion, user sees findings and summary; review is persisted.
5. User can open `/reviews/{reviewId}` later or browse a list of their past reviews.

### Functional Requirements

| ID | Requirement |
|----|-------------|
| P5-1 | Web frontend with form to submit PR URL, ticket text, and `reviewStrategy` (`v1` / `v2`). |
| P5-2 | Results view rendering `summary`, `findings[]` (category, severity, confidence, title, description), and PR metadata. |
| P5-3 | Email-code auth: request code, verify code, issue session (cookie or token). |
| P5-4 | Persist completed reviews in a database; associate each review with the authenticated user. |
| P5-5 | `GET /api/reviews/:reviewId` returns a stored review; only the owning user may access it. |
| P5-6 | `GET /api/reviews` (or equivalent) lists the current user's past reviews (metadata + link to detail). |
| P5-7 | Stable review detail URL in the frontend (e.g. `/reviews/{reviewId}`). |
| P5-8 | Unauthenticated users cannot create or list reviews (read/write requires auth). |

### Success Criteria

- A signed-in user can submit a review and see results without curl/Bruno.
- Returning to a review URL shows the same persisted result.
- Review history lists prior runs for the signed-in user.
- Auth flow completes with email code only (no password storage).

### Out of Scope for Epic 5

- OAuth / GitHub login / SSO
- Multi-tenant orgs, teams, or role-based access
- Automatic GitHub PR commenting
- Billing, quotas, or usage metering
- Polished design system or mobile-native apps

---

## API Contract (Shared)

Both versions consume and produce the same shapes.

**Request:**

```json
{
  "prUrl": "https://github.com/org/repo/pull/123",
  "ticketText": "Users must not submit empty forms.",
  "reviewStrategy": "v1"
}
```

`reviewStrategy`: `"v1"` (default) | `"v2"`

**Response:** `ReviewResponse` — `reviewId`, `status`, `input`, `pullRequest`, `findings[]`, `summary`

---

## Milestones

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Ticket 1 | Server scaffold, types, GitHub metadata fetch, placeholder review endpoint | Done |
| Tickets 2–7 | V1 baseline reviewer: diff fetch, truncation, LLM integration, prompt + structured output, full pipeline | Done |
| V2 | LangGraph agent workflow, shared output schema | Not started |
| Epic 3 | Synthetic PR dataset with labels | Not started |
| Epic 4 | W&B Weave evaluation pipeline | Not started |
| Epic 5 | Productization: web app, email-code auth, persisted review history | Not started |

---

## Capability Coverage

| Capability | PRD coverage |
|------------|--------------|
| AI-assisted PR review agent analyzing GitHub diffs and ticket context | V1 + V2: GitHub diff + ticket-aware review |
| Identify spec mismatches and regressions | Shared finding categories `requirement_gap`, `regression_risk` |
| LLM evaluation pipeline comparing review strategies | Epic 4: Weave runs across V1, V2, diff-only |
| Synthetic PRs with known regressions | Epic 3: labeled dataset |
| Node.js, LangGraph, W&B Weave, GitHub API | Node/Express + GitHub API (Ticket 1); LangGraph (V2); Weave (Epic 4) |
| Usable web product with auth and review history | Epic 5: frontend + email-code auth + DB persistence |
