import { ReviewResponse } from "../types/reviews";
import { parseGithubPrUrl } from "../utils/parseGitHubUrl";

type CreateReviewInput = {
    prUrl: string;
    ticketText?: string;
};

export function createReview(input: CreateReviewInput): ReviewResponse {
    const parsedPr = parseGithubPrUrl(input.prUrl);

    return {
        reviewId: "placeholder-review-id",
        status: "received",
        input: {
            prUrl: input.prUrl,
            ticketText: input.ticketText ?? null,
        },
        parsedPr,
        findings: [],
        summary: null,
    };
};