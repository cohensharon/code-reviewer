import OpenAI, { APIError } from "openai";

export type CompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: object;
};

export type CompletionResult = {
  rawText: string;
  model: string;
  promptVersion: string;
};

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

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  try {
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

    const rawText = response.choices[0]?.message?.content ?? "";
    return { rawText, model: response.model, promptVersion };
  } catch (error) {
    if (error instanceof APIError) {
      throw new LlmUpstreamError(
        `OpenAI API error: ${error.status} ${error.message}`
      );
    }
    throw error;
  }
}
