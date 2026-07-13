const DEFAULT_BUDGET = 50_000;
const TRUNCATION_MARKER = "\n[... diff truncated ...]\n";

type TruncateDiffResult = {
    diff: string;
    wasTruncated: boolean;
    originalLength: number;
};

export function truncateDiff(rawDiff: string): TruncateDiffResult {
    const originalLength = rawDiff.length;
    const budget = parseInt(process.env.MAX_DIFF_CHARS ?? "", 10) || DEFAULT_BUDGET;

    if (originalLength <= budget) {
        return { diff: rawDiff, wasTruncated: false, originalLength };
    }

    const headSize = Math.floor(budget * 0.7);
    const tailSize = Math.floor(budget * 0.2);

    const diff =
        rawDiff.slice(0, headSize) +
        TRUNCATION_MARKER +
        rawDiff.slice(originalLength - tailSize);

    return { diff, wasTruncated: true, originalLength };
}
