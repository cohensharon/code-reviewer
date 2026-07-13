import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../context/prepareReviewContext", () => ({
  prepareReviewContext: vi.fn(),
}));

vi.mock("../../llm/llmClient", () => ({
  completeStructured: vi.fn(),
}));

vi.mock("../../llm/parseReviewOutput", () => ({
  parseReviewOutput: vi.fn(),
  v1ReviewJsonSchema: {},
}));

vi.mock("../../prompts/v1/reviewPrompt", () => ({
  buildV1ReviewPrompt: vi.fn(),
}));

import { prepareReviewContext } from "../../context/prepareReviewContext";
import { completeStructured } from "../../llm/llmClient";
import { parseReviewOutput } from "../../llm/parseReviewOutput";
import { buildV1ReviewPrompt } from "../../prompts/v1/reviewPrompt";
import { runV1Review } from "./runV1Review";

const mockPrepareReviewContext = vi.mocked(prepareReviewContext);
const mockCompleteStructured = vi.mocked(completeStructured);
const mockParseReviewOutput = vi.mocked(parseReviewOutput);
const mockBuildV1ReviewPrompt = vi.mocked(buildV1ReviewPrompt);

const mockPR = {
  title: "Fix bug",
  author: "alice",
  branch: "fix/bug",
  changedFilesCount: 1,
};

describe("runV1Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it('returns status: "completed" when context prep and LLM are mocked successfully', async () => {
    mockPrepareReviewContext.mockResolvedValue({
      pullRequest: mockPR,
      diff: "diff content",
      wasTruncated: false,
      originalDiffLength: 12,
    });

    mockBuildV1ReviewPrompt.mockReturnValue({
      systemPrompt: "system",
      userPrompt: "user",
      version: "v1.0",
    });

    mockCompleteStructured.mockResolvedValue({
      rawText: '{"summary":"ok","findings":[]}',
      model: "gpt-4",
      promptVersion: "v1.0",
      metrics: {
        provider: "openai",
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        estimatedCostUsd: 0.01,
        latencyMs: 500,
      },
    });

    mockParseReviewOutput.mockReturnValue({
      summary: "No issues found.",
      findings: [],
    });

    const result = await runV1Review({ prUrl: "https://github.com/owner/repo/pull/1" });

    expect(result.status).toBe("completed");
    expect(mockPrepareReviewContext).toHaveBeenCalledWith({
      prUrl: "https://github.com/owner/repo/pull/1",
    });
  });
});
