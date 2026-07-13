import { ParsedGithubPrUrl } from "../utils/parseGitHubUrl";

export const FINDING_CATEGORIES = [
    "requirement_gap",
    "regression_risk",
    "edge_case",
    "implementation_concern",
] as const;

export const FINDING_SEVERITIES = ["low", "medium", "high"] as const;
export const FINDING_CONFIDENCES = ["low", "medium", "high"] as const;

export type ReviewFinding = {
    id: string;
    category: typeof FINDING_CATEGORIES[number];
    severity: typeof FINDING_SEVERITIES[number];
    title: string;
    description: string;
    confidence: typeof FINDING_CONFIDENCES[number];
}

export type ReviewResponse = {
    reviewId: string;
    status: "received" | "completed" | "failed";
    input: {
        prUrl: string, 
        ticketText: string | null,

    };
    pullRequest: {
        title: string;
        author: string;
        branch: string;
        changedFilesCount: number;
      };
    findings: ReviewFinding[];
    summary: string | null;
}