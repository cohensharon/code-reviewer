import { describe, it, expect, vi, beforeEach } from "vitest";
import { orchestrateReview, NotImplementedError } from "./reviewOrchestrator";

vi.mock("./v1/runV1Review", () => ({
  runV1Review: vi.fn().mockResolvedValue({
    reviewId: "test-id",
    status: "completed",
    input: { prUrl: "https://github.com/owner/repo/pull/1", ticketText: null },
    pullRequest: { title: "Test PR", author: "alice", branch: "main", changedFilesCount: 1 },
    findings: [],
    summary: "No issues found.",
  }),
}));

import { runV1Review } from "./v1/runV1Review";

describe("orchestrateReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults reviewStrategy to v1 when omitted", async () => {
    await orchestrateReview({ prUrl: "https://github.com/owner/repo/pull/1" });
    expect(runV1Review).toHaveBeenCalledOnce();
  });

  it("calls runV1Review when reviewStrategy is v1", async () => {
    await orchestrateReview({
      prUrl: "https://github.com/owner/repo/pull/1",
      reviewStrategy: "v1",
    });
    expect(runV1Review).toHaveBeenCalledOnce();
  });

  it("throws NotImplementedError when reviewStrategy is v2", async () => {
    await expect(
      orchestrateReview({
        prUrl: "https://github.com/owner/repo/pull/1",
        reviewStrategy: "v2",
      })
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
