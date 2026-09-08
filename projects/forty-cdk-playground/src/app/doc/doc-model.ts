export type {
  DocPage,
  DocPageApiColumns,
  DocPageApiRow,
  DocPageApiTable,
  DocPageBehaviorGroup,
  DocPageBlock,
  DocPageCell,
  DocPageHeading,
  DocPagePlainTable,
  DocPageSection,
  DocPageTable,
} from '../../../../../scripts/docs/doc-render.mjs';

/**
 * One document as the `⌘K` palette knows it: its sections, what they are
 * called, and the text they say it in
 * ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)).
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
  readonly sections: readonly DocIndexSection[];
}

export interface DocIndexSection {
  readonly title: string;
  readonly slug: string;
  /** The section's prose and table rows, clipped: what a search matches on. */
  readonly text: string;
}
