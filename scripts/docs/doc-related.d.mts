import type { DocDocument } from './doc-model.mjs';

/** One published page, and the compiled documents whose content it publishes. */
export interface DocRelatedPage {
  /** How the page is addressed in the index this returns. */
  readonly key: string;
  readonly documents: readonly DocDocument[];
}

export declare function relatedIndexOf(
  pages: readonly DocRelatedPage[],
  routes: ReadonlyMap<string, string>,
): Map<string, readonly string[]>;
