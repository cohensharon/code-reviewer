import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { truncateDiff } from "./truncateDiff";

const TRUNCATION_MARKER = "\n[... diff truncated ...]\n";
const DEFAULT_BUDGET = 50_000;

function makeDiff(length: number): string {
    return "x".repeat(length);
}

describe("truncateDiff", () => {
    describe("when diff is within budget", () => {
        it("returns the diff unchanged", () => {
            const diff = makeDiff(DEFAULT_BUDGET - 1);
            const result = truncateDiff(diff);
            expect(result.diff).toBe(diff);
        });

        it("sets wasTruncated to false", () => {
            const result = truncateDiff(makeDiff(DEFAULT_BUDGET - 1));
            expect(result.wasTruncated).toBe(false);
        });

        it("sets wasTruncated to false when diff equals the budget exactly", () => {
            const result = truncateDiff(makeDiff(DEFAULT_BUDGET));
            expect(result.wasTruncated).toBe(false);
        });

        it("returns the correct originalLength", () => {
            const diff = makeDiff(1_000);
            const result = truncateDiff(diff);
            expect(result.originalLength).toBe(1_000);
        });
    });

    describe("when diff exceeds the budget", () => {
        const oversizedDiff = makeDiff(DEFAULT_BUDGET + 10_000);

        it("sets wasTruncated to true", () => {
            const result = truncateDiff(oversizedDiff);
            expect(result.wasTruncated).toBe(true);
        });

        it("result length is within budget plus marker length", () => {
            const result = truncateDiff(oversizedDiff);
            expect(result.diff.length).toBeLessThanOrEqual(
                DEFAULT_BUDGET + TRUNCATION_MARKER.length
            );
        });

        it("contains the truncation marker exactly once", () => {
            const result = truncateDiff(oversizedDiff);
            const occurrences = result.diff.split(TRUNCATION_MARKER).length - 1;
            expect(occurrences).toBe(1);
        });

        it("preserves the head (first 70% of budget)", () => {
            const headSize = Math.floor(DEFAULT_BUDGET * 0.7);
            const result = truncateDiff(oversizedDiff);
            expect(result.diff.startsWith(oversizedDiff.slice(0, headSize))).toBe(true);
        });

        it("preserves the tail (last 20% of budget)", () => {
            const tailSize = Math.floor(DEFAULT_BUDGET * 0.2);
            const result = truncateDiff(oversizedDiff);
            expect(
                result.diff.endsWith(oversizedDiff.slice(oversizedDiff.length - tailSize))
            ).toBe(true);
        });

        it("records the original (pre-truncation) length in originalLength", () => {
            const result = truncateDiff(oversizedDiff);
            expect(result.originalLength).toBe(oversizedDiff.length);
        });
    });

    describe("MAX_DIFF_CHARS env override", () => {
        const CUSTOM_BUDGET = 500;

        beforeEach(() => {
            process.env.MAX_DIFF_CHARS = String(CUSTOM_BUDGET);
        });

        afterEach(() => {
            delete process.env.MAX_DIFF_CHARS;
        });

        it("does not truncate a diff within the custom budget", () => {
            const diff = makeDiff(CUSTOM_BUDGET);
            const result = truncateDiff(diff);
            expect(result.wasTruncated).toBe(false);
            expect(result.diff).toBe(diff);
        });

        it("truncates a diff that exceeds the custom budget", () => {
            const result = truncateDiff(makeDiff(CUSTOM_BUDGET + 100));
            expect(result.wasTruncated).toBe(true);
            expect(result.diff.length).toBeLessThanOrEqual(
                CUSTOM_BUDGET + TRUNCATION_MARKER.length
            );
        });

        it("respects the custom budget for head and tail sizing", () => {
            const diff = makeDiff(CUSTOM_BUDGET + 100);
            const headSize = Math.floor(CUSTOM_BUDGET * 0.7);
            const tailSize = Math.floor(CUSTOM_BUDGET * 0.2);
            const result = truncateDiff(diff);

            expect(result.diff.startsWith(diff.slice(0, headSize))).toBe(true);
            expect(result.diff.endsWith(diff.slice(diff.length - tailSize))).toBe(true);
        });
    });

    describe("originalLength", () => {
        it("always reflects the raw input length regardless of truncation", () => {
            const lengths = [0, 1, 1_000, DEFAULT_BUDGET, DEFAULT_BUDGET + 50_000];
            for (const len of lengths) {
                const result = truncateDiff(makeDiff(len));
                expect(result.originalLength).toBe(len);
            }
        });
    });
});
