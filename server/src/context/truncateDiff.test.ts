import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { truncateDiff } from "./truncateDiff";

const MARKER = "\n[... diff truncated ...]\n";
const DEFAULT_BUDGET = 80_000;

describe("truncateDiff", () => {
    describe("when diff is within budget", () => {
        it("returns the diff unchanged", () => {
            const input = "a".repeat(1_000);
            const result = truncateDiff(input);
            expect(result.diff).toBe(input);
        });

        it("sets wasTruncated to false", () => {
            const result = truncateDiff("short diff");
            expect(result.wasTruncated).toBe(false);
        });

        it("sets originalLength to the input length", () => {
            const input = "x".repeat(500);
            const result = truncateDiff(input);
            expect(result.originalLength).toBe(500);
        });

        it("passes through a diff exactly at the budget boundary", () => {
            const input = "a".repeat(DEFAULT_BUDGET);
            const result = truncateDiff(input);
            expect(result.wasTruncated).toBe(false);
            expect(result.diff).toBe(input);
        });
    });

    describe("when diff exceeds budget", () => {
        const input = "a".repeat(DEFAULT_BUDGET + 1_000);

        it("sets wasTruncated to true", () => {
            expect(truncateDiff(input).wasTruncated).toBe(true);
        });

        it("sets originalLength to the full input length", () => {
            expect(truncateDiff(input).originalLength).toBe(input.length);
        });

        it("includes the truncation marker exactly once", () => {
            const { diff } = truncateDiff(input);
            const occurrences = diff.split(MARKER).length - 1;
            expect(occurrences).toBe(1);
        });

        it("result length is within budget + marker length", () => {
            const { diff } = truncateDiff(input);
            expect(diff.length).toBeLessThanOrEqual(DEFAULT_BUDGET + MARKER.length);
        });
    });

    describe("MAX_DIFF_CHARS env override", () => {
        beforeEach(() => {
            process.env.MAX_DIFF_CHARS = "1000";
        });

        afterEach(() => {
            delete process.env.MAX_DIFF_CHARS;
        });

        it("respects a smaller budget from env", () => {
            const input = "a".repeat(2_000);
            const result = truncateDiff(input);
            expect(result.wasTruncated).toBe(true);
            expect(result.diff.length).toBeLessThanOrEqual(1_000 + MARKER.length);
        });

        it("does not truncate when diff fits in the overridden budget", () => {
            const input = "a".repeat(500);
            const result = truncateDiff(input);
            expect(result.wasTruncated).toBe(false);
        });
    });
});
