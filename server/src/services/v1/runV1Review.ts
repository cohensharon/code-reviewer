import { randomUUID } from "crypto";
import { prepareReviewContext } from "../../context/prepareReviewContext";
import { buildV1ReviewPrompt } from "../../prompts/v1/reviewPrompt";
import { completeStructured } from "../../llm/llmClient";
import { parseReviewOutput, v1ReviewJsonSchema } from "../../llm/parseReviewOutput";
import type { ReviewResponse } from "../../types/reviews";

type RunV1ReviewInput = {
  prUrl: string;
  ticketText?: string;
};

export async function runV1Review(input: RunV1ReviewInput): Promise<ReviewResponse> {
  const startMs = Date.now();
  const reviewId = randomUUID();

  const { pullRequest, diff, wasTruncated } = await prepareReviewContext({
    prUrl: input.prUrl,
  });

  const { systemPrompt, userPrompt, version } = buildV1ReviewPrompt({
    ticketText: input.ticketText,
    pullRequest,
    diff,
  });

  const { rawText, model, promptVersion, metrics } = await completeStructured(
    { systemPrompt, userPrompt, responseSchema: v1ReviewJsonSchema },
    version
  );

  const { summary, findings: rawFindings } = parseReviewOutput(rawText);

  const findings = rawFindings.map((finding, n) => ({
    ...finding,
    id: randomUUID() ?? `finding-${n}`,
  }));

  const elapsedMs = Date.now() - startMs;

  console.log(
    JSON.stringify({
      reviewId,
      prUrl: input.prUrl,
      promptVersion,
      model,
      wasTruncated,
      findingCount: findings.length,
      elapsedMs,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      totalTokens: metrics.totalTokens,
      estimatedCostUsd: metrics.estimatedCostUsd,
      llmLatencyMs: metrics.latencyMs,
      ...(metrics.reasoningEffort && { reasoningEffort: metrics.reasoningEffort }),
    })
  );

  return {
    reviewId,
    status: "completed",
    input: {
      prUrl: input.prUrl,
      ticketText: input.ticketText ?? null,
    },
    pullRequest,
    findings,
    summary,
  };
}
