import { describe, it, expect } from "vitest";
import { buildV1ReviewPrompt, PROMPT_VERSION } from "./reviewPrompt";
import type { PullRequestMetadata } from "../../services/githubService";

const basePR: PullRequestMetadata = {
  title: "Add login endpoint",
  author: "alice",
  branch: "feature/login",
  changedFilesCount: 3,
};

const baseDiff = `diff --git a/src/auth.ts b/src/auth.ts
+export function login() {}`;

describe("buildV1ReviewPrompt", () => {
  it("returns version === 'v1.0'", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.version).toBe("v1.0");
  });

  it("version matches PROMPT_VERSION constant", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.version).toBe(PROMPT_VERSION);
  });

  it("includes ticket text in user prompt when provided", () => {
    const result = buildV1ReviewPrompt({
      ticketText: "Users should be able to log in with email and password.",
      pullRequest: basePR,
      diff: baseDiff,
    });
    expect(result.userPrompt).toContain(
      "Users should be able to log in with email and password."
    );
  });

  it("uses fallback text when ticketText is null", () => {
    const result = buildV1ReviewPrompt({
      ticketText: null,
      pullRequest: basePR,
      diff: baseDiff,
    });
    expect(result.userPrompt).toContain("(not provided — review diff only)");
  });

  it("uses fallback text when ticketText is undefined", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain("(not provided — review diff only)");
  });

  it("includes PR title in user prompt", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain("Add login endpoint");
  });

  it("includes PR author in user prompt", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain("alice");
  });

  it("includes PR branch in user prompt", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain("feature/login");
  });

  it("includes changed files count in user prompt", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain("3");
  });

  it("includes the diff string in user prompt", () => {
    const result = buildV1ReviewPrompt({ pullRequest: basePR, diff: baseDiff });
    expect(result.userPrompt).toContain(baseDiff);
  });
});
