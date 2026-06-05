# PR Review + Ticket Context Agent — Project Proposal

## Product Problem

Human PR reviews often miss issues because reviewers lack context, are overloaded, or focus only on the changed lines. AI reviewers can help, but generic diff-only review often produces shallow comments. This project explores a more structured approach: an agent that reviews a PR against both the code diff and the ticket/spec, then separates findings into requirement gaps, regressions, risky assumptions, and implementation concerns.

The core question is whether adding ticket context makes the review better or merely more narrowly focused. The project should produce not only review output, but also evaluation results comparing different review strategies.

## MVP Scope

The MVP is a working PR review agent with a small UI wrapper, Node.js backend, GitHub integration, LangGraph-based review workflow, and W&B Weave evaluation pipeline.

The user enters a GitHub PR URL and ticket/spec text. The backend fetches PR metadata and diffs, prepares relevant context, and runs an agent workflow that performs multiple review passes: first understanding the ticket, then inspecting the diff, then checking for spec mismatches, regressions, edge cases, and risky implementation choices. The output is a structured review report with categorized findings and confidence levels.

The MVP should be small enough to complete in 30–40 hours, so it will use a curated set of synthetic PRs with known issues rather than trying to support arbitrary large production repos. It will not include automatic GitHub commenting, enterprise auth, full repo indexing, fine-tuning, or a polished production UI.

## Tech Stack

UI wrapper: React or Next.js with a simple form and review results page.

Backend/API: Node.js, TypeScript, Express, GitHub REST API.

Agent workflow: LangGraph orchestrating review steps, with OpenAI or Anthropic as the model provider.

Evaluation: W&B Weave for experiment tracking, prompt/agent strategy comparison, and scoring against synthetic PRs with known regressions.

## Main System Design Problems

The main engineering challenges are context selection, diff parsing, agent step design, structured outputs, evaluation design, and signal-to-noise control. The system needs to decide what context to send to the model, how to split review responsibilities across agent steps, how to avoid generic or hallucinated comments, and how to measure whether one review strategy is actually better than another.

## MVP Epics / Build Iterations

### Epic 1 — Baseline PR Review Flow

Build the simplest end-to-end workflow: submit PR URL + ticket text, fetch GitHub diff, run a baseline review, and display structured findings. This creates the control case for later comparison.

### Epic 2 — Agentic Review Workflow

Convert the baseline into a LangGraph workflow with distinct review steps: ticket comprehension, diff analysis, requirement matching, regression detection, and final report synthesis. This is the real MVP agent behavior.

### Epic 3 — Synthetic PR Dataset

Create a small dataset of synthetic PRs with known issues: missing requirements, incorrect edge-case handling, regressions, and harmless changes. This gives the project a controlled test set instead of relying on vibes.

### Epic 4 — W&B Weave Evaluation

Use Weave to compare review strategies such as diff-only review, ticket-aware review, and multi-step agent review. Track detection rate, false positives, hallucinations, and quality of categorized findings.

## Success Criteria

The project succeeds if it produces a credible working agent, a small but meaningful evaluation dataset, and evidence that different review strategies perform differently. The final resume signal should be: I built an AI-assisted PR review agent, designed an evaluation pipeline, and used real metrics to compare how ticket context affects review quality.
