export declare const GITHUB_REPO: string;

export declare const GITHUB_BLOB_BASE: string;

export interface DocLinkContext {
  readonly sourcePath: string;
  readonly routes: ReadonlyMap<string, string>;
  readonly blobBase: string;
  readonly prepareUrl?: (url: string) => string;
}

export interface ResolvedDocLink {
  readonly kind: 'route' | 'source';
  readonly repoPath: string;
  readonly route: string | null;
  readonly href: string;
}

export interface DocRoutesInput {
  readonly primitiveSlugs: readonly string[];
  readonly guideSlugs: readonly string[];
}

export declare function splitDocHref(href: string): { path: string; fragment: string };

export declare function resolveRepoPath(sourcePath: string, relativePath: string): string | null;

export declare function guideSlugOf(file: string): string;

export declare function buildDocRoutes(input: DocRoutesInput): Map<string, string>;

export declare function resolveDocLink(
  href: string,
  context: DocLinkContext,
): ResolvedDocLink | null;
