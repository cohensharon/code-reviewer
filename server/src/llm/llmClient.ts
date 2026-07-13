import OpenAI, { APIError } from "openai";

export type AiCallMetrics = {
  provider: "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  reasoningEffort?: "low" | "medium" | "high";
  promptVersion?: string;
};

export type CompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  reasoningEffort?: "low" | "medium" | "high";
};

export type CompletionResult = {
  rawText: string;
  model: string;
  promptVersion: string;
  metrics: AiCallMetrics;
};

// Pricing per million tokens (input / output) in USD.
// Extend this map as new models are added.
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gpt-5.6-sol":   { inputPerM: 5.00,  outputPerM: 30.00  },
  "gpt-5.6-terra": { inputPerM: 2.50,  outputPerM: 15.00  },
  "gpt-5.6-luna":  { inputPerM: 1.00,  outputPerM: 6.00   },
  "gpt-5.5-pro":   { inputPerM: 30.00, outputPerM: 180.00 },
  "gpt-5.5":       { inputPerM: 5.00,  outputPerM: 30.00  },
  "gpt-5.4-pro":   { inputPerM: 30.00, outputPerM: 180.00 },
  "gpt-5.4-mini":  { inputPerM: 0.75,  outputPerM: 4.50   },
  "gpt-5.4-nano":  { inputPerM: 0.20,  outputPerM: 1.25   },
  "gpt-5.4":       { inputPerM: 2.50,  outputPerM: 15.00  },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const entry = Object.entries(MODEL_PRICING).find(([key]) =>
    model.toLowerCase().startsWith(key)
  );
  if (!entry) return 0;
  const { inputPerM, outputPerM } = entry[1];
  return (inputTokens / 1_000_000) * inputPerM + (outputTokens / 1_000_000) * outputPerM;
}

export class LlmUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUpstreamError";
  }
}

export async function completeStructured(
  request: CompletionRequest,
  promptVersion: string
): Promise<CompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please configure this environment variable before starting the server."
    );
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });

  try {
    const callStart = Date.now();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "review_output",
          schema: request.responseSchema,
          strict: true,
        },
      },
    });
    const latencyMs = Date.now() - callStart;

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const totalTokens = response.usage?.total_tokens ?? inputTokens + outputTokens;
    const resolvedModel = response.model;

    const metrics: AiCallMetrics = {
      provider: "openai",
      model: resolvedModel,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd: estimateCost(resolvedModel, inputTokens, outputTokens),
      latencyMs,
      reasoningEffort: request.reasoningEffort,
      promptVersion,
    };

    const rawText = response.choices[0]?.message?.content ?? "";
    return { rawText, model: resolvedModel, promptVersion, metrics };
  } catch (error) {
    if (error instanceof APIError) {
      throw new LlmUpstreamError(
        `OpenAI API error: ${error.status} ${error.message}`
      );
    }
    throw error;
  }
}
