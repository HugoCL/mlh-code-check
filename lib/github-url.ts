/**
 * GitHub URL Parser Utility
 * Parses various GitHub repository URL formats and extracts owner, repo, and optional branch.
 */

export interface ParsedGitHubUrl {
    owner: string;
    repo: string;
    branch?: string;
}

export interface GitHubFileUrlArgs {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    lineStart?: number;
    lineEnd?: number;
}

export interface GitHubUrlParseSuccess {
    success: true;
    data: ParsedGitHubUrl;
}

export interface GitHubUrlParseError {
    success: false;
    error: string;
}

export type GitHubUrlParseResult = GitHubUrlParseSuccess | GitHubUrlParseError;

/**
 * Parses a GitHub repository URL and extracts owner, repo name, and optional branch.
 *
 * Supported formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/branch/path/to/file
 * - git@github.com:owner/repo.git
 * - git@github.com:owner/repo
 *
 * @param url - The GitHub URL to parse
 * @returns A result object with parsed data or an error message
 */
export function parseGitHubUrl(url: string): GitHubUrlParseResult {
    if (!url || typeof url !== "string") {
        return {
            success: false,
            error: "URL is required and must be a string",
        };
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
        return {
            success: false,
            error: "URL cannot be empty",
        };
    }

    // Try SSH format: git@github.com:owner/repo.git or git@github.com:owner/repo
    const sshMatch = trimmedUrl.match(
        /^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/
    );
    if (sshMatch) {
        const owner = sshMatch[1];
        const repo = sshMatch[2];

        if (!isValidOwnerOrRepo(owner) || !isValidOwnerOrRepo(repo)) {
            return {
                success: false,
                error: "Invalid owner or repository name in URL",
            };
        }

        return {
            success: true,
            data: { owner, repo },
        };
    }

    // Try HTTPS formats
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(trimmedUrl);
    } catch {
        return {
            success: false,
            error: "Invalid URL format",
        };
    }

    // Validate protocol
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        return {
            success: false,
            error: "URL must use HTTP or HTTPS protocol",
        };
    }

    // Validate it's a GitHub URL
    if (
        parsedUrl.hostname !== "github.com" &&
        parsedUrl.hostname !== "www.github.com"
    ) {
        return {
            success: false,
            error: "URL must be a GitHub repository URL (github.com)",
        };
    }

    // Parse the pathname
    const pathname = parsedUrl.pathname;

    // Remove leading slash and split
    const parts = pathname.replace(/^\//, "").split("/").filter(Boolean);

    if (parts.length < 2) {
        return {
            success: false,
            error: "URL must include owner and repository name",
        };
    }

    const owner = parts[0];
    let repo = parts[1];

    // Remove .git suffix if present
    if (repo.endsWith(".git")) {
        repo = repo.slice(0, -4);
    }

    if (!isValidOwnerOrRepo(owner) || !isValidOwnerOrRepo(repo)) {
        return {
            success: false,
            error: "Invalid owner or repository name in URL",
        };
    }

    // Check for branch in /tree/branch format
    // Branch names can contain slashes, so we join all remaining parts after "tree"
    let branch: string | undefined;
    if (parts.length >= 4 && parts[2] === "tree") {
        // Join all parts after "tree" to support branch names with slashes
        branch = parts.slice(3).join("/");
    }

    return {
        success: true,
        data: {
            owner,
            repo,
            ...(branch && { branch }),
        },
    };
}

/**
 * Validates that a string is a valid GitHub owner or repository name.
 * GitHub usernames and repo names can contain alphanumeric characters and hyphens,
 * but cannot start or end with a hyphen, and cannot have consecutive hyphens.
 */
function isValidOwnerOrRepo(name: string): boolean {
    if (!name || name.length === 0) {
        return false;
    }

    // GitHub names can contain alphanumeric characters, hyphens, underscores, and dots
    // They cannot be empty and have reasonable length limits
    if (name.length > 100) {
        return false;
    }

    // Basic validation - alphanumeric, hyphens, underscores, dots
    const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;
    return validPattern.test(name);
}

/**
 * Constructs a GitHub URL from parsed components.
 * Useful for round-trip testing and URL normalization.
 *
 * @param data - The parsed GitHub URL data
 * @returns A normalized HTTPS GitHub URL
 */
export function constructGitHubUrl(data: ParsedGitHubUrl): string {
    const baseUrl = `https://github.com/${data.owner}/${data.repo}`;
    if (data.branch) {
        return `${baseUrl}/tree/${data.branch}`;
    }
    return baseUrl;
}

/**
 * Constructs a GitHub file URL with optional line range anchors.
 */
export function constructGitHubFileUrl({
    owner,
    repo,
    branch,
    filePath,
    lineStart,
    lineEnd,
}: GitHubFileUrlArgs): string {
    const encodedBranch = encodePathSegments(branch);
    const encodedPath = encodePathSegments(filePath);
    const baseUrl = `https://github.com/${owner}/${repo}/blob/${encodedBranch}/${encodedPath}`;

    if (lineStart && lineEnd && lineEnd !== lineStart) {
        return `${baseUrl}#L${lineStart}-L${lineEnd}`;
    }

    if (lineStart) {
        return `${baseUrl}#L${lineStart}`;
    }

    return baseUrl;
}

/**
 * Checks if a URL is a valid GitHub repository URL without parsing details.
 *
 * @param url - The URL to check
 * @returns true if the URL is a valid GitHub repository URL
 */
export function isGitHubUrl(url: string): boolean {
    return parseGitHubUrl(url).success;
}

function encodePathSegments(path: string): string {
    return path
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}
