
// export type PlaceholderPullRequest = {
//     owner: string;
//     repo: string;
//     pullNumber: number;
//     title: string;
//     author: string;
//     state: "open" | "closed";
// };

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

export async function getPullRequest(
    input: GetPullRequestInput
): Promise<PullRequestMetadata> {
    const { owner, repo, pullNumber } = input;
    console.log("!!!!!!!!!!", owner, repo, pullNumber);

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
            headers: {
                Accept: "application/vnd.github+json",
            },
        }
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

