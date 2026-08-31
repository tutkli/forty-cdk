import type { DocDocument } from './doc-model.mjs';
import type { DocPage, DocPageSection } from './doc-render.mjs';

export declare function foldedSlug(slug: string, headingSlug: string): string;

export declare function demoteMarkdown(markdown: string, by: number): string;

export declare function foldableOf(document: DocDocument): DocDocument;

export declare function withFold(
  page: DocPage,
  section: string,
  folded: Pick<DocPageSection, 'headings' | 'blocks'>,
): DocPage;
