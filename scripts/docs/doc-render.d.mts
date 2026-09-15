import type { DocDocument, DocProseBlock, DocSectionRing } from './doc-model.mjs';

/** A link the renderer resolved, and the route it navigates to in-app if any. */
export interface DocLinkTarget {
  readonly href: string;
  readonly route: string | null;
}

export type DocLinkResolver = (href: string, sourcePath: string) => DocLinkTarget | null;

/** What a rendered document needs beyond its own content to resolve links. */
export interface DocRenderContext {
  readonly sourcePath: string;
  readonly resolveLink: DocLinkResolver;
}

/** A cell rendered once: markup to bind, and the text its labels read. */
export interface DocPageCell {
  readonly html: string;
  readonly text: string;
}

export interface DocPageApiColumns {
  readonly property: string;
  readonly type: string;
  readonly default: string | null;
  readonly description: string;
}

export interface DocPageApiRow {
  readonly property: DocPageCell;
  readonly type: DocPageCell;
  readonly default: DocPageCell | null;
  readonly description: DocPageCell;
}

export interface DocPageApiTable {
  readonly role: 'api';
  readonly columns: DocPageApiColumns;
  readonly rows: readonly DocPageApiRow[];
}

export interface DocPagePlainTable {
  readonly role: 'plain';
  readonly columns: readonly DocPageCell[];
  readonly rows: readonly (readonly DocPageCell[])[];
}

export type DocPageTable = DocPageApiTable | DocPagePlainTable;

export interface DocPageProse {
  readonly kind: 'prose';
  readonly html: string;
}

export interface DocPageTableBlock {
  readonly kind: 'table';
  readonly table: DocPageTable;
}

export type DocPageBlock = DocPageProse | DocPageTableBlock;

export interface DocPageHeading {
  readonly depth: number;
  /** The heading as the table of contents shows it, inline markup resolved away. */
  readonly text: string;
  readonly slug: string;
}

export interface DocPageSection {
  readonly title: string;
  /**
   * The title's markup, present only when it carries a tag — a `##` naming a
   * class, a selector or an HTML element. Absent, `title` is the whole of it.
   */
  readonly titleHtml?: string;
  readonly slug: string;
  /** Which ring of the page-template contract the section falls in. */
  readonly ring: DocSectionRing;
  readonly headings: readonly DocPageHeading[];
  readonly blocks: readonly DocPageBlock[];
}

/** One secondary demo as its page renders it: the heading, and the line under it. */
export interface DocPageExample {
  readonly title: string;
  /** The title's markup, present only when it carries a tag. */
  readonly titleHtml?: string;
  /** The anchor the demo emits, and the key its `<demo-layout>` names. */
  readonly slug: string;
  /** Inline markup, or `null` for a heading the document opens with something else. */
  readonly prose: string | null;
}

/**
 * The container a page's specific sections nest under in its table of contents
 * ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 */
export interface DocPageBehaviorGroup {
  readonly title: string;
  /** The container section's anchor, or `null` when the document declares none. */
  readonly slug: string | null;
}

/**
 * One page a page is related to, as the navigation would list it
 * ([#1938](https://github.com/tutkli/forty-cdk/issues/1938)).
 */
export interface DocPageRelated {
  /** The route the site publishes the target under, from the site root. */
  readonly route: string;
  /** The navigation group the target is listed under. */
  readonly group: string;
  readonly title: string;
  /** The target's lede, as its registry publishes it. */
  readonly description: string;
}

/** One document as its page renders it, and nothing the page does not read. */
export interface DocPage {
  /** Prose only: a table above the first section fails the compile. */
  readonly intro: readonly DocPageProse[];
  /**
   * The line the page prints above its hero, as inline markup — `## Examples`'
   * opening paragraph, lifted out of the section it introduces
   * ([#1920](https://github.com/tutkli/forty-cdk/issues/1920)).
   */
  readonly caption: string | null;
  /**
   * The secondary demos the document declares, in the order the page projects
   * them ([#1940](https://github.com/tutkli/forty-cdk/issues/1940)).
   */
  readonly examples: readonly DocPageExample[];
  /** `null` for a document whose rail the grouping would not improve. */
  readonly behaviorGroup: DocPageBehaviorGroup | null;
  readonly sections: readonly DocPageSection[];
  /**
   * The pages this one links or is linked by, in the order and under the groups
   * the navigation lists them — empty for a document with no internal links.
   */
  readonly related: readonly DocPageRelated[];
}

export interface DocRenderOptions {
  /** Repository path to published route, as `buildDocRoutes` maps them. */
  readonly routes: ReadonlyMap<string, string>;
  readonly blobBase?: string;
  /** The corpus's own answer for this page; absent, the page renders no block. */
  readonly related?: readonly DocPageRelated[];
}

export declare function renderDocProse(
  block: DocProseBlock,
  context: DocRenderContext | null,
): string;

export declare function renderInlineMarkdown(md: string, context?: DocRenderContext): string;

export declare function headingText(markdown: string): string;

export declare function renderDocCell(md: string, context?: DocRenderContext): DocPageCell;

export declare function renderDocument(document: DocDocument, options: DocRenderOptions): DocPage;
