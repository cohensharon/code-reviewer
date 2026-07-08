# Architecture & Product Decisions

## ADR-001: V2 Must Not Overwrite V1

**Status:** Accepted  
**Date:** 2026-07-08

### Context

The project has two review implementations with different architectures:

- **V1 (baseline):** Single-shot LLM call — ticket text + diff → structured findings via prompt engineering.
- **V2 (agentic):** LangGraph multi-step workflow — ticket comprehension, diff analysis, requirement matching, regression detection, report synthesis.

A core project goal is to **compare review strategies** using W&B Weave on a synthetic PR dataset with known issues. That comparison requires both implementations to remain runnable against the same inputs and produce the same output schema.

### Decision

**V2 will be added alongside V1, not replace it.**

- V1 code stays in the codebase as the permanent baseline / control case.
- V2 lives in a separate module (e.g., `server/src/services/v2/` or `server/src/agents/`) with its own LangGraph graph.
- The API selects the strategy via an explicit parameter (`reviewStrategy: "v1" | "v2"`), defaulting to `"v1"`.
- Shared infrastructure (GitHub fetch, URL parsing, types, context truncation) is extracted and reused; strategy-specific logic stays isolated.
- Evaluation runs invoke both strategies on the same dataset rows and log results to Weave under distinct strategy labels.

### Consequences

**Positive:**

- Fair A/B comparison between single-shot and agentic review on identical inputs.
- V1 remains a simpler fallback and faster iteration surface for prompt experiments.
- Delivers on the project goal: an agentic reviewer and an evaluation pipeline that compares it to a baseline.

**Negative:**

- Some duplication of orchestration entry points (two review runners).
- Maintenance burden for two paths until/unless V1 is formally deprecated after evaluation (not planned for this project scope).

### Alternatives Considered

1. **V2 replaces V1** — Rejected. Destroys the control case needed for Weave comparison and weakens the evaluation story.
2. **Feature flag only, same code path** — Rejected. Architectures are fundamentally different (one LLM call vs. graph); a flag inside one service would entangle concerns.
3. **Separate repos** — Rejected. Shared types, GitHub layer, and dataset fixtures benefit from one repo.

### Implementation Notes

- Do not delete or refactor V1 review logic into V2 when V2 ships.
- If prompt templates or finding categories evolve, update both strategies or version the schema explicitly.
- Weave traces should tag `strategy: v1 | v2 | diff_only` on every evaluation run.
