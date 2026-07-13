import type { PullRequestMetadata } from "../../services/githubService";
import { FINDING_CATEGORIES, FINDING_SEVERITIES, FINDING_CONFIDENCES } from "../../types/reviews";

export const PROMPT_VERSION = "v1.0";

type BuildPromptInput = {
  ticketText?: string | null;
  pullRequest: PullRequestMetadata;
  diff: string;
};

type BuiltPrompt = {
  systemPrompt: string;
  userPrompt: string;
  version: string;
};

export function buildV1ReviewPrompt(input: BuildPromptInput): BuiltPrompt {
  const { ticketText, pullRequest, diff } = input;

  const systemPrompt = `You are an expert code reviewer. You will be given a ticket or spec describing the intended change and a unified diff of a pull request. Your job is to identify actionable issues only.

Return ONLY valid JSON matching this exact schema — no prose, no markdown, no explanation outside the JSON:
{
  "summary": "<string>",
  "findings": [
    {
      "category": ${FINDING_CATEGORIES.map(c => `"${c}"`).join(" | ")},
      "severity": ${FINDING_SEVERITIES.map(s => `"${s}"`).join(" | ")},
      "confidence": ${FINDING_CONFIDENCES.map(c => `"${c}"`).join(" | ")},
      "title": "<string>",
      "description": "<string>"
    }
  ]
}

Rules:
- Each finding must have a category of exactly one of: ${FINDING_CATEGORIES.join(", ")}.
- Assign severity (exactly one of: ${FINDING_SEVERITIES.join(", ")}) and confidence (exactly one of: ${FINDING_CONFIDENCES.join(", ")}) per finding.
- Do not include generic praise or positive observations — only report actionable issues.
- A ticket or spec may not always be provided. When absent, state clearly in the summary that no ticket was provided and focus your review on diff-only risks such as regressions, edge cases, and implementation concerns. Do not penalize the absence of a ticket.`;

  const ticketSection = ticketText ?? "(not provided — review diff only)";

  const userPrompt = `Ticket / spec:
${ticketSection}

PR metadata:
- Title: ${pullRequest.title}
- Author: ${pullRequest.author}
- Branch: ${pullRequest.branch}
- Changed files: ${pullRequest.changedFilesCount}

Unified diff:
${diff}`;

  return { systemPrompt, userPrompt, version: PROMPT_VERSION };
}
