import type { DocProblem } from '../docs/doc-model.mjs';

/**
 * How the gate treats one TypeScript fence: `compile` must type-check,
 * `fragment` is never compiled, `expect-error` must fail to type-check.
 */
export type SnippetMode = 'compile' | 'fragment' | 'expect-error';

/** One TypeScript fence, addressed by document path and opening-fence line. */
export interface DocSnippet {
  readonly path: string;
  readonly line: number;
  readonly code: string;
  readonly mode: SnippetMode;
}

/** The marker values a fence may declare, `compile` being the absence of one. */
export declare const SNIPPET_MODES: readonly ['fragment', 'expect-error'];

export declare function snippetsOf(
  source: string,
  path: string,
): {
  readonly snippets: readonly DocSnippet[];
  readonly problems: readonly DocProblem[];
};
