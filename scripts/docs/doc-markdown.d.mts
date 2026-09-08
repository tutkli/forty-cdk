import type { DocDocument } from './doc-model.mjs';

/** One inline link the scan found, and the line it was written on. */
export interface DocMarkdownLink {
  readonly href: string;
  readonly line: number;
}

/** The absolute URL to publish an href as, or `null` to leave it as written. */
export type DocMarkdownResolver = (href: string, sourcePath: string) => string | null;

export declare function markdownLinksOf(markdown: string): readonly DocMarkdownLink[];

export declare function rewriteMarkdownLinks(
  markdown: string,
  rewrite: (href: string) => string | null,
): string;

export declare function documentMarkdown(
  document: DocDocument,
  resolveHref: DocMarkdownResolver,
): string;
