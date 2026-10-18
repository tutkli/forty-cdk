import type { DocDocument } from './doc-model.mjs';
import type { DocPage, DocPageSection } from './doc-render.mjs';

/**
 * One document as the `⌘K` palette knows it: what its page says above the
 * first section, its sections, what they are called, and the text they say it
 * in ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)).
 *
 * The palette is reachable from every page and the body text is 97 kB gzipped,
 * so this is the one part of the site's data **not** in the initial bundle:
 * `loadSearchIndex` pulls it as its own chunk the first time a reader opens the
 * palette, and until it arrives the palette offers documents rather than
 * sections. A document's title and source path stay off it for the older
 * reason — they are already on its own compiled module, which loads with the
 * page.
 */
export interface DocIndexEntry {
  readonly kind: 'primitive' | 'guide' | 'page';
  readonly slug: string;
  /** The intro below the lede, clipped like a section: empty when there is none. */
  readonly intro: string;
  readonly sections: readonly DocIndexSection[];
}

export interface DocIndexSection {
  readonly title: string;
  readonly slug: string;
  /** The section's prose and table rows, clipped: what a search matches on. */
  readonly text: string;
}

/** A README another page republishes, and the host section it lands in. */
export interface DocIndexFold {
  readonly section: string;
  readonly folded: Pick<DocPageSection, 'headings' | 'blocks'>;
}

export declare function searchTextOf(section: Pick<DocPageSection, 'headings' | 'blocks'>): string;

export declare function searchEntryOf(
  document: Pick<DocDocument, 'kind' | 'slug'>,
  page: DocPage,
  folds?: readonly DocIndexFold[],
): DocIndexEntry;
