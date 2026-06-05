import { ParsedGithubPrUrl } from "../utils/parseGitHubUrl";


export type ReviewFinding = {
    id: string;
    category: "requirement_gap", "regression_risk", "edge_case", "implementation_concern";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    confidence: "low" | "medium" | "high";
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