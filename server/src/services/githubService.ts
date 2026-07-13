
type GetPullRequestInput = {
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

    if (!response.ok) {
        throw new Error(`Github PR not found or unavailable: ${owner}/${repo}#${pullNumber}`);
    }

    const data = await response.json();

    return {
        title: data.title,
        author: data.user.login,
        branch: data.head.ref,
        changedFilesCount: data.changed_files,
    };
}

