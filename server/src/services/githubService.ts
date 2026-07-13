
export class GitHubNotFoundError extends Error {}
export class GitHubUpstreamError extends Error {}

export type GetPullRequestInput = {
    owner: string;
    repo: string;
    pullNumber: number;
};

export type PullRequestMetadata = {
    title: string;
    author: string;
    branch: string;
    changedFilesCount: number;
};

function githubHeaders(): HeadersInit {
    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

export async function getPullRequest(
    input: GetPullRequestInput
): Promise<PullRequestMetadata> {
    const { owner, repo, pullNumber } = input;

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        { headers: githubHeaders() }
    );

    if (response.status === 404) {
        throw new GitHubNotFoundError(`PR not found: ${owner}/${repo}#${pullNumber}`);
    }
    if (!response.ok) {
        throw new GitHubUpstreamError(`GitHub error ${response.status}: ${owner}/${repo}#${pullNumber}`);
    }

    const data = await response.json();

    return {
        title: data.title,
        author: data.user.login,
        branch: data.head.ref,
        changedFilesCount: data.changed_files,
    };
}

export async function getPullRequestDiff(
    input: GetPullRequestInput
): Promise<string> {
    const { owner, repo, pullNumber } = input;

    const headers: HeadersInit = {
        ...githubHeaders(),
        Accept: "application/vnd.github.diff",
    };

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        { headers }
    );

    if (response.status === 404) {
        throw new GitHubNotFoundError(`PR not found: ${owner}/${repo}#${pullNumber}`);
    }
    if (response.status === 403 || response.status >= 500) {
        throw new GitHubUpstreamError(`GitHub error ${response.status}: ${owner}/${repo}#${pullNumber}`);
    }
    if (!response.ok) {
        throw new GitHubUpstreamError(`GitHub error ${response.status}: ${owner}/${repo}#${pullNumber}`);
    }

    return response.text();
}

