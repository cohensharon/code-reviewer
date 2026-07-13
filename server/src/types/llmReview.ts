import type { ReviewFinding } from "./reviews";

// expected response shape from model
export type LlmReviewOutput = {
  summary: string;
  findings: Array<{
    category: ReviewFinding["category"];
    severity: ReviewFinding["severity"];
    confidence: ReviewFinding["confidence"];
    title: string;
    description: string;
  }>;
};
