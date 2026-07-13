import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/githubService", () => ({
  getPullRequest: vi.fn(),
  getPullRequestDiff: vi.fn(),
  GitHubNotFoundError: class GitHubNotFoundError extends Error {},
  GitHubUpstreamError: class GitHubUpstreamError extends Error {},
}));

vi.mock("./truncateDiff", () => ({
  truncateDiff: vi.fn(),
}));

import {
  getPullRequest,
  getPullRequestDiff,
  GitHubNotFoundError,
  GitHubUpstreamError,
} from "../services/githubService";
import { truncateDiff } from "./truncateDiff";
import { prepareReviewContext } from "./prepareReviewContext";

const mockGetPullRequest = vi.mocked(getPullRequest);
const mockGetPullRequestDiff = vi.mocked(getPullRequestDiff);
const mockTruncateDiff = vi.mocked(truncateDiff);

const mockPR = {
  title: "Fix bug",
  author: "alice",
  branch: "fix/bug",
  changedFilesCount: 2,
};

describe("prepareReviewContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getPullRequest and getPullRequestDiff with parsed URL coords", async () => {
    mockGetPullRequest.mockResolvedValue(mockPR);
    mockGetPullRequestDiff.mockResolvedValue("raw diff");
    mockTruncateDiff.mockReturnValue({
      diff: "raw diff",
      wasTruncated: false,
      originalLength: 8,
    });

    await prepareReviewContext({ prUrl: "https://github.com/owner/repo/pull/42" });

    const expectedCoords = { owner: "owner", repo: "repo", pullNumber: 42 };
    expect(mockGetPullRequest).toHaveBeenCalledWith(expectedCoords);
    expect(mockGetPullRequestDiff).toHaveBeenCalledWith(expectedCoords);
  });

  it("returns truncated diff when input exceeds budget", async () => {
    const oversizedDiff = "x".repeat(100_000);
    mockGetPullRequest.mockResolvedValue(mockPR);
    mockGetPullRequestDiff.mockResolvedValue(oversizedDiff);
    mockTruncateDiff.mockReturnValue({
      diff: "truncated diff",
      wasTruncated: true,
      originalLength: 100_000,
    });

    const result = await prepareReviewContext({ prUrl: "https://github.com/owner/repo/pull/1" });

    expect(mockTruncateDiff).toHaveBeenCalledWith(oversizedDiff);
    expect(result).toEqual({
      pullRequest: mockPR,
      diff: "truncated diff",
      wasTruncated: true,
      originalDiffLength: 100_000,
    });
  });

  it("propagates GitHubNotFoundError when PR fetch fails", async () => {
    mockGetPullRequest.mockRejectedValue(new GitHubNotFoundError("PR not found"));
    mockGetPullRequestDiff.mockResolvedValue("diff");

    await expect(
      prepareReviewContext({ prUrl: "https://github.com/owner/repo/pull/999" })
    ).rejects.toBeInstanceOf(GitHubNotFoundError);
  });

  it("propagates GitHubUpstreamError when GitHub returns upstream error", async () => {
    mockGetPullRequest.mockResolvedValue(mockPR);
    mockGetPullRequestDiff.mockRejectedValue(new GitHubUpstreamError("GitHub error 503"));

    await expect(
      prepareReviewContext({ prUrl: "https://github.com/owner/repo/pull/1" })
    ).rejects.toBeInstanceOf(GitHubUpstreamError);
  });
});
