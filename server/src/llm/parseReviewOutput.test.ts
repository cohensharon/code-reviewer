import { describe, it, expect } from "vitest";
import { parseReviewOutput, LlmParseError } from "./parseReviewOutput";
import type { LlmReviewOutput } from "../types/llmReview";

const validOutput: LlmReviewOutput = {
  summary: "The PR partially addresses the ticket but has issues.",
  findings: [
    {
      category: "requirement_gap",
      severity: "high",
      confidence: "medium",
      title: "Missing form validation",
      description: "The form does not validate empty submissions.",
    },
  ],
};

describe("parseReviewOutput", () => {
  it("returns LlmReviewOutput for a valid JSON string", () => {
    const result = parseReviewOutput(JSON.stringify(validOutput));
    expect(result).toEqual(validOutput);
  });

  it("throws LlmParseError for malformed JSON", () => {
    expect(() => parseReviewOutput("not valid { json")).toThrow(LlmParseError);
  });

  it("throws LlmParseError when required fields are missing", () => {
    const missing = { summary: "No findings field here" };
    expect(() => parseReviewOutput(JSON.stringify(missing))).toThrow(
      LlmParseError
    );
  });

  it("throws LlmParseError when severity is not a valid enum value", () => {
    const invalid: object = {
      ...validOutput,
      findings: [{ ...validOutput.findings[0], severity: "critical" }],
    };
    expect(() => parseReviewOutput(JSON.stringify(invalid))).toThrow(
      LlmParseError
    );
  });

  it("throws LlmParseError when confidence is not a valid enum value", () => {
    const invalid: object = {
      ...validOutput,
      findings: [{ ...validOutput.findings[0], confidence: "very_high" }],
    };
    expect(() => parseReviewOutput(JSON.stringify(invalid))).toThrow(
      LlmParseError
    );
  });
});
