import type { ParsedDoc } from '../markdown';

const HEADING_ID = /<h[1-6] id="([^"]+)"/g;
const SAME_DOCUMENT_FRAGMENT = /\]\(#([^)\s]+)\)/g;

/**
 * Every anchor a parsed page lands on, in document order
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * Two channels rather than one, because the parser slugs its two heading levels
 * through different code: a `##` becomes a section whose `slug` `DocSection`
 * binds to `[id]` on the `<section>` element, while everything below it is an
 * `id` the markdown renderer writes into the HTML. A scan that read only the
 * rendered HTML would miss every section anchor on the page, which is the half
 * a cross-page fragment usually points at.
 *
 * The pattern matches an `id` on a heading tag specifically. A bare ` id="`
 * scan also picks up the attributes inside a fenced code sample — `escapeHtml`
 * leaves quotes alone, so `<div id="my-dialog">` inside a fence survives into
 * the rendered text — and those are not anchors on the page.
 */
export function headingIds(doc: ParsedDoc): readonly string[] {
  const ids = doc.sections.map((section) => section.slug);
  const scan = (html: string): void => {
    for (const match of html.matchAll(HEADING_ID)) {
      ids.push(match[1]!);
    }
  };
  scan(doc.intro);
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (block.kind === 'html') {
        scan(block.html);
      }
    }
  }
  return ids;
}

/** The `](#fragment)` targets a document writes at itself, in source order. */
export function sameDocumentFragments(markdown: string): readonly string[] {
  return [...markdown.matchAll(SAME_DOCUMENT_FRAGMENT)].map((match) => match[1]!);
}
