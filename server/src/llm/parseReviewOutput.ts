import { z } from "zod";
import type { LlmReviewOutput } from "../types/llmReview";
import {
  FINDING_CATEGORIES,
  FINDING_SEVERITIES,
  FINDING_CONFIDENCES,
} from "../types/reviews";

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmParseError";
  }
}

const llmReviewOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      category: z.enum(FINDING_CATEGORIES),
      severity: z.enum(FINDING_SEVERITIES),
      confidence: z.enum(FINDING_CONFIDENCES),
      title: z.string(),
      description: z.string(),
    })
  ),
});

export const v1ReviewJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: [...FINDING_CATEGORIES] },
          severity: { type: "string", enum: [...FINDING_SEVERITIES] },
          confidence: { type: "string", enum: [...FINDING_CONFIDENCES] },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["category", "severity", "confidence", "title", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "findings"],
  additionalProperties: false,
};

export function parseReviewOutput(rawText: string): LlmReviewOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new LlmParseError(
      `Failed to parse LLM output as JSON: ${rawText.slice(0, 100)}`
    );
  }

  const result = llmReviewOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new LlmParseError(
      `LLM output failed schema validation: ${result.error.message}`
    );
  }

  return result.data;
}
