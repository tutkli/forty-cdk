export type {
  DocApiColumns,
  DocApiRow,
  DocApiTable,
  DocBlock,
  DocDocument,
  DocHeading,
  DocKind,
  DocPlainTable,
  DocProseBlock,
  DocSection,
  DocTable,
  DocTableBlock,
} from '../../../../../scripts/docs/doc-model.mjs';

/**
 * One document as the navigation and the `⌘K` palette know it: enough to name
 * it and to link into it, and no content.
 *
 * The palette is reachable from every page, so what it indexes is what the
 * initial bundle carries. Section titles and anchors are the whole of it —
 * indexing body text is [#1813](https://github.com/tutkli/forty-cdk/issues/1813)
 * and lands with its own measurement of the weight it adds.
 */
export interface DocIndexEntry {
  readonly kind: 'primitive' | 'guide';
  readonly slug: string;
  /** Repository-relative path of the document the entry was compiled from. */
  readonly path: string;
  readonly title: string;
  readonly sections: readonly DocIndexSection[];
}

export interface DocIndexSection {
  readonly title: string;
  readonly slug: string;
}
