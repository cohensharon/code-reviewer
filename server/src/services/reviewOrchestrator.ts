import type { ReviewResponse } from "../types/reviews";
import { runV1Review } from "./v1/runV1Review";

export type CreateReviewInput = {
  prUrl: string;
  ticketText?: string;
  reviewStrategy?: "v1" | "v2";
};

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

export async function orchestrateReview(input: CreateReviewInput): Promise<ReviewResponse> {
  const strategy = input.reviewStrategy ?? "v1";

  if (strategy === "v1") {
    return runV1Review(input);
  }

  throw new NotImplementedError(`Review strategy "${strategy}" is not yet implemented`);
}
