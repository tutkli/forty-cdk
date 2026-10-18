import type { DocProblem } from './doc-model.mjs';

/** A published primitive's page module, `null` when that file does not exist. */
export interface DocPageSource {
  readonly slug: string;
  readonly source: string | null;
}

export interface DocRouteEntry {
  readonly slug: string;
  readonly title: string;
}

export interface DocRoutesInput {
  /** The primitives the site publishes a page for. */
  readonly primitives: readonly DocRouteEntry[];
  /** The guides the site publishes. */
  readonly guides: readonly DocRouteEntry[];
  /** The site's own pages, served from the root. */
  readonly pages?: readonly DocRouteEntry[];
}

export declare function pageSymbolOf(slug: string): string;

export declare function pageFileOf(slug: string): string;

export declare function pageProblems(pages: readonly DocPageSource[]): readonly DocProblem[];

export declare function routesModule(input: DocRoutesInput): string;
