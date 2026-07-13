import { describe, it, expect, vi, afterEach } from "vitest";
import {
    getPullRequest,
    getPullRequestDiff,
    GitHubNotFoundError,
    GitHubUpstreamError,
} from "./githubService";

function mockFetch(status: number, body: unknown, text?: string) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(text ?? ""),
        })
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getPullRequest", () => {
    it("returns PR metadata on a successful response", async () => {
        mockFetch(200, {
            title: "Fix bug",
            user: { login: "alice" },
            head: { ref: "fix/bug" },
            changed_files: 3,
        });

        const result = await getPullRequest({ owner: "org", repo: "repo", pullNumber: 1 });

        expect(result).toEqual({
            title: "Fix bug",
            author: "alice",
            branch: "fix/bug",
            changedFilesCount: 3,
        });
    });

    it("throws GitHubNotFoundError on 404", async () => {
        mockFetch(404, {});
        await expect(
            getPullRequest({ owner: "org", repo: "repo", pullNumber: 999 })
        ).rejects.toBeInstanceOf(GitHubNotFoundError);
    });

    it("throws GitHubUpstreamError on 500", async () => {
        mockFetch(500, {});
        await expect(
            getPullRequest({ owner: "org", repo: "repo", pullNumber: 1 })
        ).rejects.toBeInstanceOf(GitHubUpstreamError);
    });

    it("throws GitHubUpstreamError on 403", async () => {
        mockFetch(403, {});
        await expect(
            getPullRequest({ owner: "org", repo: "repo", pullNumber: 1 })
        ).rejects.toBeInstanceOf(GitHubUpstreamError);
    });
});

describe("getPullRequestDiff", () => {
    it("returns the raw diff string on success", async () => {
        mockFetch(200, {}, "diff --git a/foo.ts b/foo.ts\n+added line");
        const result = await getPullRequestDiff({ owner: "org", repo: "repo", pullNumber: 1 });
        expect(result).toBe("diff --git a/foo.ts b/foo.ts\n+added line");
    });

    it("throws GitHubNotFoundError on 404", async () => {
        mockFetch(404, {});
        await expect(
            getPullRequestDiff({ owner: "org", repo: "repo", pullNumber: 999 })
        ).rejects.toBeInstanceOf(GitHubNotFoundError);
    });

    it("throws GitHubUpstreamError on 403", async () => {
        mockFetch(403, {});
        await expect(
            getPullRequestDiff({ owner: "org", repo: "repo", pullNumber: 1 })
        ).rejects.toBeInstanceOf(GitHubUpstreamError);
    });

    it("throws GitHubUpstreamError on 500", async () => {
        mockFetch(500, {});
        await expect(
            getPullRequestDiff({ owner: "org", repo: "repo", pullNumber: 1 })
        ).rejects.toBeInstanceOf(GitHubUpstreamError);
    });

    it("sends Accept: application/vnd.github.diff header", async () => {
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve("diff"),
        });
        vi.stubGlobal("fetch", fetchSpy);

        await getPullRequestDiff({ owner: "org", repo: "repo", pullNumber: 1 });

        const [, options] = fetchSpy.mock.calls[0];
        expect((options.headers as Record<string, string>)["Accept"]).toBe(
            "application/vnd.github.diff"
        );
    });
});
