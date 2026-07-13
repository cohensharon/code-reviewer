import { describe, it, expect } from "vitest";
import { parseGithubPrUrl } from "./parseGitHubUrl";

describe("parseGithubPrUrl", () => {
    it("parses a valid PR URL", () => {
        const result = parseGithubPrUrl("https://github.com/owner/repo/pull/42");
        expect(result).toEqual({ owner: "owner", repo: "repo", pullNumber: 42 });
    });

    it("parses a URL with a trailing slash", () => {
        const result = parseGithubPrUrl("https://github.com/owner/repo/pull/42/");
        expect(result).toEqual({ owner: "owner", repo: "repo", pullNumber: 42 });
    });

    it("throws on a completely invalid URL", () => {
        expect(() => parseGithubPrUrl("not-a-url")).toThrow("Invalid github PR URL");
    });

    it("throws when hostname is not github.com", () => {
        expect(() =>
            parseGithubPrUrl("https://gitlab.com/owner/repo/pull/1")
        ).toThrow("URL must be from github.com");
    });

    it("throws when the path is missing the pull segment", () => {
        expect(() =>
            parseGithubPrUrl("https://github.com/owner/repo/issues/1")
        ).toThrow("URL must match format");
    });

    it("throws when pull number is missing", () => {
        expect(() =>
            parseGithubPrUrl("https://github.com/owner/repo/pull/")
        ).toThrow("URL must match format");
    });

    it("throws when pull number is not a positive integer", () => {
        expect(() =>
            parseGithubPrUrl("https://github.com/owner/repo/pull/0")
        ).toThrow("Pull request number must be a positive integer");
    });

    it("throws when pull number is negative", () => {
        expect(() =>
            parseGithubPrUrl("https://github.com/owner/repo/pull/-5")
        ).toThrow("Pull request number must be a positive integer");
    });

    it("throws when pull number is not numeric", () => {
        expect(() =>
            parseGithubPrUrl("https://github.com/owner/repo/pull/abc")
        ).toThrow("Pull request number must be a positive integer");
    });
});
