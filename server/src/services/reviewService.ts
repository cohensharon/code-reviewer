import { ReviewResponse } from "../types/reviews";
import { parseGithubPrUrl } from "../utils/parseGitHubUrl";
import { getPullRequest } from "./githubService";

type CreateReviewInput = {
    prUrl: string;
    ticketText?: string;
};

export async function createReview(input: CreateReviewInput): Promise<ReviewResponse> {
    const parsedPr = parseGithubPrUrl(input.prUrl);

    const pullRequest = await getPullRequest(parsedPr);

    return {
        reviewId: "placeholder-review-id",
        status: "received",
        input: {
            prUrl: input.prUrl,
            ticketText: input.ticketText ?? null,
        },
        pullRequest,
        findings: [],
        summary: null,
    };
};