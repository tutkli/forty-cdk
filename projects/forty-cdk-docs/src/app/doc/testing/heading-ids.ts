import { anchorsOf, type DocDocument } from '../../../../../../scripts/docs/doc-model.mjs';

const SAME_DOCUMENT_FRAGMENT = /\]\(#([^)\s]+)\)/g;

/**
 * Every anchor a compiled page lands on, in document order
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * One channel now, where there used to be two. The old parser slugged its `##`
 * headings in one place and wrote the rest as `id` attributes into rendered
 * HTML, so reading the anchors of a page meant scanning both — and a bare
 * ` id="` scan picked up the attributes inside fenced code samples along the
 * way. The compiler mints every anchor of a document from one slugger, so the
 * model is the list.
 */
export function headingIds(document: DocDocument): readonly string[] {
  return anchorsOf(document);
}

/** The `](#fragment)` targets a document writes at itself, in source order. */
export function sameDocumentFragments(markdown: string): readonly string[] {
  return [...markdown.matchAll(SAME_DOCUMENT_FRAGMENT)].map((match) => match[1]!);
}
