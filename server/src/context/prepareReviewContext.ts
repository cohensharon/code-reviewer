import type { PullRequestMetadata } from "../services/githubService";
import { getPullRequest, getPullRequestDiff } from "../services/githubService";
import { truncateDiff } from "./truncateDiff";
import { parseGithubPrUrl } from "../utils/parseGitHubUrl";

export type ReviewContextInput = {
  prUrl: string;
};

export type ReviewContext = {
  pullRequest: PullRequestMetadata;
  diff: string;
  wasTruncated: boolean;
  originalDiffLength: number;
};

export async function prepareReviewContext(
  input: ReviewContextInput,
): Promise<ReviewContext> {
  const parsedPr = parseGithubPrUrl(input.prUrl);

  const [pullRequest, rawDiff] = await Promise.all([
    getPullRequest(parsedPr),
    getPullRequestDiff(parsedPr),
  ]);

  const { diff, wasTruncated, originalLength } = truncateDiff(rawDiff);

  return {
    pullRequest,
    diff,
    wasTruncated,
    originalDiffLength: originalLength,
  };
}
