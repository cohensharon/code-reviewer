
export type ParsedGithubPrUrl = {
    owner: string;
    repo: string;
    pullNumber: number;
};

export function parseGithubPrUrl(prUrl: string): ParsedGithubPrUrl {
    let url;

    try {
        url = new URL(prUrl);
    } catch {
        throw new Error("Invalid github PR URL");
    }

    if (url.hostname !== "github.com") {
        throw new Error("URL mus tbe from github.com");
    }

    const parts = url.pathname.split("/").filter(Boolean);

    const [owner, repo, pullKeyword, pullNumberRaw] = parts;

    if (!owner || !repo || pullKeyword !== "pull" || !pullNumberRaw) {
        throw new Error("URL must match format: https://github.com/owner/repo/pull/123");
    }

    const pullNumber = Number(pullNumberRaw);

    if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
        throw new Error("Pull request number must be a positive integer");
    }

    return {
        owner,
        repo,
        pullNumber
    };
}