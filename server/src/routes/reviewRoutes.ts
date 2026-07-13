import { Router, Request, Response } from "express";
import { orchestrateReview, NotImplementedError } from "../services/reviewOrchestrator";
import { GitHubNotFoundError, GitHubUpstreamError } from "../services/githubService";
import { LlmUpstreamError } from "../llm/llmClient";
import { LlmParseError } from "../llm/parseReviewOutput";

const router = Router();

router.post("/reviews", async (req: Request, res: Response) => {
  const { prUrl, ticketText, reviewStrategy } = req.body;

  if (!prUrl) {
    res.status(400).json({ errors: ["prUrl is required"] });
    return;
  }

  try {
    const response = await orchestrateReview({ prUrl, ticketText, reviewStrategy });
    res.json(response);
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      res.status(400).json({ errors: [error.message] });
    } else if (error instanceof GitHubUpstreamError) {
      res.status(502).json({ errors: [error.message] });
    } else if (error instanceof LlmUpstreamError) {
      res.status(502).json({ errors: [error.message] });
    } else if (error instanceof LlmParseError) {
      res.status(400).json({ errors: [error.message] });
    } else if (error instanceof NotImplementedError) {
      res.status(501).json({ errors: [error.message] });
    } else if (error instanceof Error) {
      res.status(400).json({ errors: [error.message] });
    } else {
      res.status(500).json({ errors: ["Internal server error"] });
    }
  }
});

export default router;
