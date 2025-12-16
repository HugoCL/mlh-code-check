import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    constructGitHubUrl,
    isGitHubUrl,
    parseGitHubUrl,
    type ParsedGitHubUrl,
} from "../../lib/github-url";

/**
 * Arbitrary for generating valid GitHub owner/repo names
 * GitHub names can contain alphanumeric characters, hyphens, underscores, and dots
 */
const validGitHubNameArbitrary = fc
    .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,38}[a-zA-Z0-9]$/)
    .filter((s) => s.length >= 1 && s.length <= 39);

// Simpler arbitrary for single character names
const singleCharNameArbitrary = fc.stringMatching(/^[a-zA-Z0-9]$/);

// Combined arbitrary that handles both single and multi-char names
const gitHubNameArbitrary = fc.oneof(
    singleCharNameArbitrary,
    validGitHubNameArbitrary
);

/**
 * Arbitrary for generating valid branch names
 * Branch names should only contain URL-safe characters to ensure round-trip consistency
 * Valid characters: alphanumeric, hyphens, underscores, forward slashes
 * Note: Dots are excluded because URL parsing normalizes /./  to / which breaks round-trip
 */
const validBranchArbitrary = fc
    .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,48}[a-zA-Z0-9]$/)
    .filter((s) => s.length >= 2 && !s.includes("//") && !s.includes("/.") && !s.includes("./"));

// Single character branch names
const singleCharBranchArbitrary = fc.stringMatching(/^[a-zA-Z0-9]$/);

// Combined branch arbitrary that handles both single and multi-char branch names
const branchArbitrary = fc.oneof(singleCharBranchArbitrary, validBranchArbitrary);

/**
 * Arbitrary for generating valid parsed GitHub URL data
 */
const parsedGitHubUrlArbitrary: fc.Arbitrary<ParsedGitHubUrl> = fc.record({
    owner: gitHubNameArbitrary,
    repo: gitHubNameArbitrary,
    branch: fc.option(branchArbitrary, { nil: undefined }),
});

/**
 * **Feature: ai-code-review, Property 20: GitHub URL parsing correctness**
 * *For any* valid GitHub repository URL (https://github.com/owner/repo, with optional
 * /tree/branch suffix, or git@ format), parsing SHALL extract the correct owner,
 * repository name, and branch (if specified).
 * **Validates: Requirements 9.1**
 */
describe("Property 20: GitHub URL parsing correctness", () => {
    it("should correctly parse HTTPS URLs without branch", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `https://github.com/${owner}/${repo}`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(owner);
                        expect(result.data.repo).toBe(repo);
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should correctly parse HTTPS URLs with .git suffix", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `https://github.com/${owner}/${repo}.git`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(owner);
                        expect(result.data.repo).toBe(repo);
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should correctly parse HTTPS URLs with branch", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                branchArbitrary,
                async (owner, repo, branch) => {
                    const url = `https://github.com/${owner}/${repo}/tree/${branch}`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(owner);
                        expect(result.data.repo).toBe(repo);
                        expect(result.data.branch).toBe(branch);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should correctly parse SSH URLs", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `git@github.com:${owner}/${repo}.git`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(owner);
                        expect(result.data.repo).toBe(repo);
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should correctly parse SSH URLs without .git suffix", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `git@github.com:${owner}/${repo}`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(owner);
                        expect(result.data.repo).toBe(repo);
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: ai-code-review, Property 21: GitHub URL parsing round-trip**
 * *For any* parsed GitHub URL components (owner, repo, branch), reconstructing
 * a URL and re-parsing SHALL produce the same components.
 * **Validates: Requirements 9.1**
 */
describe("Property 21: GitHub URL parsing round-trip", () => {
    it("should produce same components after round-trip for URLs without branch", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const original: ParsedGitHubUrl = { owner, repo };

                    // Construct URL from components
                    const url = constructGitHubUrl(original);

                    // Parse the constructed URL
                    const result = parseGitHubUrl(url);

                    // Property: Round-trip should preserve components
                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(original.owner);
                        expect(result.data.repo).toBe(original.repo);
                        expect(result.data.branch).toBe(original.branch);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should produce same components after round-trip for URLs with branch", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                branchArbitrary,
                async (owner, repo, branch) => {
                    const original: ParsedGitHubUrl = { owner, repo, branch };

                    // Construct URL from components
                    const url = constructGitHubUrl(original);

                    // Parse the constructed URL
                    const result = parseGitHubUrl(url);

                    // Property: Round-trip should preserve components
                    expect(result.success).toBe(true);
                    if (result.success) {
                        expect(result.data.owner).toBe(original.owner);
                        expect(result.data.repo).toBe(original.repo);
                        expect(result.data.branch).toBe(original.branch);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should produce same components after round-trip using parsedGitHubUrlArbitrary", async () => {
        await fc.assert(
            fc.asyncProperty(parsedGitHubUrlArbitrary, async (original) => {
                // Construct URL from components
                const url = constructGitHubUrl(original);

                // Parse the constructed URL
                const result = parseGitHubUrl(url);

                // Property: Round-trip should preserve components
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.owner).toBe(original.owner);
                    expect(result.data.repo).toBe(original.repo);
                    expect(result.data.branch).toBe(original.branch);
                }
            }),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: ai-code-review, Property 23: Branch default behavior**
 * *For any* GitHub URL without an explicit branch specification, the parsed
 * result SHALL have branch as undefined, signaling the system to use the
 * repository's default branch.
 * **Validates: Requirements 9.5**
 */
describe("Property 23: Branch default behavior", () => {
    it("should return undefined branch for HTTPS URLs without /tree/ path", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `https://github.com/${owner}/${repo}`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        // Property: Branch should be undefined when not specified
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should return undefined branch for SSH URLs", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `git@github.com:${owner}/${repo}.git`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        // Property: Branch should be undefined for SSH URLs (no branch support)
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should return undefined branch for URLs with .git suffix", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `https://github.com/${owner}/${repo}.git`;
                    const result = parseGitHubUrl(url);

                    expect(result.success).toBe(true);
                    if (result.success) {
                        // Property: Branch should be undefined when not specified
                        expect(result.data.branch).toBeUndefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * **Feature: ai-code-review, Property 24: Invalid URL error handling**
 * *For any* invalid GitHub URL (malformed, non-GitHub domain, missing owner/repo),
 * parsing SHALL return a failure result with an appropriate error message.
 * **Validates: Requirements 9.6**
 */
describe("Property 24: Invalid URL error handling", () => {
    it("should return error for non-GitHub domain URLs", async () => {
        const nonGitHubDomains = fc.oneof(
            fc.constant("gitlab.com"),
            fc.constant("bitbucket.org"),
            fc.constant("example.com"),
            fc.constant("google.com"),
            fc.webUrl().map((url) => {
                try {
                    return new URL(url).hostname;
                } catch {
                    return "example.com";
                }
            })
        );

        await fc.assert(
            fc.asyncProperty(
                nonGitHubDomains,
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (domain, owner, repo) => {
                    // Skip if domain happens to be github.com
                    fc.pre(domain !== "github.com" && domain !== "www.github.com");

                    const url = `https://${domain}/${owner}/${repo}`;
                    const result = parseGitHubUrl(url);

                    // Property: Non-GitHub URLs should fail
                    expect(result.success).toBe(false);
                    if (!result.success) {
                        expect(result.error).toContain("GitHub");
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should return error for URLs missing repository name", async () => {
        await fc.assert(
            fc.asyncProperty(gitHubNameArbitrary, async (owner) => {
                const url = `https://github.com/${owner}`;
                const result = parseGitHubUrl(url);

                // Property: URLs without repo should fail
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toBeDefined();
                }
            }),
            { numRuns: 100 }
        );
    });

    it("should return error for empty or whitespace URLs", async () => {
        const emptyOrWhitespace = fc.oneof(
            fc.constant(""),
            fc.constant("   "),
            fc.constant("\t"),
            fc.constant("\n")
        );

        await fc.assert(
            fc.asyncProperty(emptyOrWhitespace, async (url) => {
                const result = parseGitHubUrl(url);

                // Property: Empty URLs should fail
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toBeDefined();
                }
            }),
            { numRuns: 20 }
        );
    });

    it("should return error for malformed URLs", async () => {
        const malformedUrls = fc.oneof(
            fc.constant("not-a-url"),
            fc.constant("http://"),
            fc.constant("github.com/owner/repo"), // Missing protocol
            fc.constant("://github.com/owner/repo"),
            fc.constant("ftp://github.com/owner/repo")
        );

        await fc.assert(
            fc.asyncProperty(malformedUrls, async (url) => {
                const result = parseGitHubUrl(url);

                // Property: Malformed URLs should fail
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(result.error).toBeDefined();
                }
            }),
            { numRuns: 20 }
        );
    });

    it("should return error for null/undefined inputs", () => {
        // @ts-expect-error - Testing invalid input
        const nullResult = parseGitHubUrl(null);
        expect(nullResult.success).toBe(false);

        // @ts-expect-error - Testing invalid input
        const undefinedResult = parseGitHubUrl(undefined);
        expect(undefinedResult.success).toBe(false);
    });

    it("isGitHubUrl should return false for invalid URLs", async () => {
        const invalidUrls = fc.oneof(
            fc.constant(""),
            fc.constant("not-a-url"),
            fc.constant("https://gitlab.com/owner/repo"),
            fc.constant("https://github.com/owner") // Missing repo
        );

        await fc.assert(
            fc.asyncProperty(invalidUrls, async (url) => {
                // Property: isGitHubUrl should return false for invalid URLs
                expect(isGitHubUrl(url)).toBe(false);
            }),
            { numRuns: 20 }
        );
    });

    it("isGitHubUrl should return true for valid URLs", async () => {
        await fc.assert(
            fc.asyncProperty(
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                async (owner, repo) => {
                    const url = `https://github.com/${owner}/${repo}`;
                    // Property: isGitHubUrl should return true for valid URLs
                    expect(isGitHubUrl(url)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
