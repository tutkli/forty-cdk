import type { DocProblem } from './doc-model.mjs';

/** A published primitive's page module, `null` when that file does not exist. */
export interface DocPageSource {
  readonly slug: string;
  readonly source: string | null;
}

export interface DocRoutesInput {
  /** Slugs of the primitives the site publishes a page for. */
  readonly primitiveSlugs: readonly string[];
  /** Slugs of the guides the site publishes. */
  readonly guideSlugs: readonly string[];
}

export declare function pageSymbolOf(slug: string): string;

export declare function pageFileOf(slug: string): string;

export declare function pageProblems(pages: readonly DocPageSource[]): readonly DocProblem[];

export declare function routesModule(input: DocRoutesInput): string;
