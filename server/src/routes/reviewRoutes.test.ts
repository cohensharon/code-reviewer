import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import reviewRoutes from "./reviewRoutes";

vi.mock("../services/reviewOrchestrator", async (importActual) => {
  const actual = await importActual<typeof import("../services/reviewOrchestrator")>();
  return {
    ...actual,
    orchestrateReview: vi.fn(),
  };
});

import { orchestrateReview } from "../services/reviewOrchestrator";
import { GitHubNotFoundError, GitHubUpstreamError } from "../services/githubService";
import { LlmUpstreamError } from "../llm/llmClient";
import { LlmParseError } from "../llm/parseReviewOutput";
import { NotImplementedError } from "../services/reviewOrchestrator";

const app = express();
app.use(express.json());
app.use("/api", reviewRoutes);

const mockOrchestrate = vi.mocked(orchestrateReview);

describe("POST /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when prUrl is missing", async () => {
    const res = await request(app).post("/api/reviews").send({});
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain("prUrl is required");
  });

  it("returns 400 when prUrl is not a valid GitHub PR URL", async () => {
    mockOrchestrate.mockRejectedValueOnce(new Error("URL must match format: https://github.com/owner/repo/pull/123"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://not-github.com/foo" });
    expect(res.status).toBe(400);
  });

  it("maps GitHubNotFoundError to 400", async () => {
    mockOrchestrate.mockRejectedValueOnce(new GitHubNotFoundError("PR not found"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://github.com/owner/repo/pull/1" });
    expect(res.status).toBe(400);
  });

  it("maps GitHubUpstreamError to 502", async () => {
    mockOrchestrate.mockRejectedValueOnce(new GitHubUpstreamError("GitHub error 503"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://github.com/owner/repo/pull/1" });
    expect(res.status).toBe(502);
  });

  it("maps LlmUpstreamError to 502", async () => {
    mockOrchestrate.mockRejectedValueOnce(new LlmUpstreamError("OpenAI error"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://github.com/owner/repo/pull/1" });
    expect(res.status).toBe(502);
  });

  it("maps LlmParseError to 400", async () => {
    mockOrchestrate.mockRejectedValueOnce(new LlmParseError("Failed to parse LLM output"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://github.com/owner/repo/pull/1" });
    expect(res.status).toBe(400);
  });

  it("maps NotImplementedError (reviewStrategy: v2) to 501", async () => {
    mockOrchestrate.mockRejectedValueOnce(new NotImplementedError("Review strategy v2 is not yet implemented"));
    const res = await request(app).post("/api/reviews").send({ prUrl: "https://github.com/owner/repo/pull/1", reviewStrategy: "v2" });
    expect(res.status).toBe(501);
  });
});
