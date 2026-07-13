# Ticket 4 — Diff Truncation

**Status:** Done
**Builds on:** Ticket 3

## Summary

Add `context/truncateDiff.ts` — a deterministic, budget-based truncation function that keeps the diff within a configurable character limit before it is sent to the LLM. No LLM call is made in this ticket.

## Scope

### New file: `server/src/context/truncateDiff.ts`

```typescript
type TruncateDiffResult = {
  diff: string;
  wasTruncated: boolean;
  originalLength: number;
};

export function truncateDiff(rawDiff: string): TruncateDiffResult;
```

#### Algorithm (from architecture spec)

1. Read budget from `process.env.MAX_DIFF_CHARS` (default `50_000`).
2. If `rawDiff.length <= budget` → return unchanged, `wasTruncated: false`.
3. If over budget:
   - Keep the first **70%** of the budget from the start.
   - Keep the last **20%** of the budget from the end.
   - Insert `"\n[... diff truncated ...]\n"` between the two segments.
   - `wasTruncated: true`.
4. Always include `originalLength` in the result regardless of truncation.

The `wasTruncated` flag and `originalLength` are for internal logging only — not exposed in the V1 API response.

### Env vars introduced

| Var              | Required | Default  | Purpose                                 |
| ---------------- | -------- | -------- | --------------------------------------- |
| `MAX_DIFF_CHARS` | No       | `50_000` | Character budget for diff passed to LLM |

Add to `.env.example`:

```
MAX_DIFF_CHARS=
```

## Acceptance Criteria

- [ ] A diff shorter than the budget passes through unchanged with `wasTruncated: false`
- [ ] A diff longer than the budget is truncated; result length ≤ budget + marker length
- [ ] The `[... diff truncated ...]` marker appears exactly once in the truncated output
- [ ] `originalLength` always reflects the raw input length
- [ ] Budget can be overridden via `MAX_DIFF_CHARS` env var

## Files Touched

```
server/
└── src/
    └── context/
        └── truncateDiff.ts    # new file
.env.example                    # MAX_DIFF_CHARS placeholder
```
