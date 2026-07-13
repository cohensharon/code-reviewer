import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("openai", () => {
  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  class OpenAI {
    chat = {
      completions: {
        create: vi.fn().mockRejectedValue(new APIError(429, "Rate limit exceeded")),
      },
    };
  }

  return { default: OpenAI, APIError };
});

import { completeStructured, LlmUpstreamError } from "./llmClient";

describe("completeStructured", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  it("throws LlmUpstreamError when OpenAI returns a non-200 response", async () => {
    await expect(
      completeStructured(
        { systemPrompt: "You are a reviewer.", userPrompt: "Review this.", responseSchema: {} },
        "v1.0"
      )
    ).rejects.toThrow(LlmUpstreamError);
  });
});
