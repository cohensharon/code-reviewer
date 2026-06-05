import { Router, Request, Response } from "express";
import type { ReviewResponse } from "../types/reviews";
import { createReview } from "../services/reviewService";

const router = Router();

router.post("/reviews", (req: Request, res: Response) => {
    const { prUrl, ticketText } = req.body;

    if (!prUrl) {
        res.status(400).json({
          errors: ["prUrl is required"],
        });
      return;
    }

    try {
      const response: ReviewResponse = createReview({ prUrl, ticketText });
      res.json(response);
    } catch (error) {
      res.status(400).json({
        errors: [
          error instanceof Error ? error.message : "Invalid request",
        ],
      });
    }
});

export default router;