export type {
  DocPage,
  DocPageApiColumns,
  DocPageApiRow,
  DocPageApiTable,
  DocPageBlock,
  DocPageCell,
  DocPageHeading,
  DocPagePlainTable,
  DocPageSection,
  DocPageTable,
} from '../../../../../scripts/docs/doc-render.mjs';

/**
 * One document as the `⌘K` palette knows it: which sections it has and what
 * they are called, and nothing else.
 *
 * The palette is reachable from every page, so this index is what the **initial
 * bundle** carries — which is why it holds only what `buildSearchEntries` reads.
 * A document's title and source path are already on its own compiled module,
 * which loads with the page; repeating them here would be weight on every
 * route to save a lookup on one. Indexing body text is
 * [#1813](https://github.com/tutkli/forty-cdk/issues/1813), and lands with its
 * own measurement of what it adds.
 */
export interface DocIndexEntry {
  readonly kind: 'primitive' | 'guide';
  readonly slug: string;
  readonly sections: readonly DocIndexSection[];
}

export interface DocIndexSection {
  readonly title: string;
  readonly slug: string;
}
