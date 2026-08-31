/** Which half of the corpus a document belongs to. */
export type DocKind = 'primitive' | 'guide';

/** A heading below a document's title, with the anchor the compiler minted. */
export interface DocHeading {
  readonly depth: number;
  /** The heading's markdown, which may carry inline code or emphasis. */
  readonly text: string;
  readonly slug: string;
}

/**
 * The header cells of a table the compiler read as an API table.
 *
 * Every cell of a table — header or body — is the markdown it was written as
 * with GFM's own cell escaping already resolved, so a literal pipe reads as a
 * bare `|`. That is what an inline renderer wants; re-serialising a row back
 * into a markdown table has to escape it again.
 */
export interface DocApiColumns {
  readonly property: string;
  readonly type: string;
  /** `null` for the three-column shape, which documents no default. */
  readonly default: string | null;
  readonly description: string;
}

/** One documented member, addressed by column rather than by cell index. */
export interface DocApiRow {
  readonly property: string;
  readonly type: string;
  readonly default: string | null;
  readonly description: string;
}

/**
 * A table whose header matches the API shape, read as records.
 *
 * Every cell is the markdown it was written as; rendering is the consumer's.
 */
export interface DocApiTable {
  readonly role: 'api';
  readonly columns: DocApiColumns;
  readonly rows: readonly DocApiRow[];
}

/** Any other table, kept as a header row and data rows of equal width. */
export interface DocPlainTable {
  readonly role: 'plain';
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export type DocTable = DocApiTable | DocPlainTable;

/**
 * A run of prose as its author wrote it, plus the anchors its headings carry.
 *
 * `headingSlugs` lists them in document order so a renderer assigns anchors by
 * consuming the list rather than by slugging the text a second time.
 */
export interface DocProseBlock {
  readonly kind: 'prose';
  readonly markdown: string;
  readonly headingSlugs: readonly string[];
}

export interface DocTableBlock {
  readonly kind: 'table';
  readonly table: DocTable;
}

export type DocBlock = DocProseBlock | DocTableBlock;

/**
 * Which ring of the page-template contract a section belongs to: `core` and
 * `canonical` are the headings the contract names, `specific` is everything a
 * document has to say that no template could have anticipated.
 */
export type DocSectionRing = 'core' | 'canonical' | 'specific';

/** A level-2 heading and everything under it, up to the next one. */
export interface DocSection {
  /** The heading's markdown. */
  readonly title: string;
  readonly slug: string;
  readonly ring: DocSectionRing;
  /** Every heading below this section's own, in document order. */
  readonly headings: readonly DocHeading[];
  readonly blocks: readonly DocBlock[];
}

/** The registry metadata an entry point's README declares as frontmatter. */
export interface DocMeta {
  /** The name the navigation, the page header and search show. */
  readonly title: string;
  readonly group: 'primitives' | 'utilities' | 'none';
  readonly archetype: readonly string[];
  readonly apgUrl: string | null;
}

/** One compiled document: an entry point's README, or a published guide. */
export interface DocDocument {
  /** Repository-relative path, the string the link resolver is handed. */
  readonly path: string;
  /** The route the site publishes the document under. */
  readonly slug: string;
  readonly kind: DocKind;
  /** Declared frontmatter for a README; `null` for a guide, which declares none. */
  readonly meta: DocMeta | null;
  /** The level-1 heading's markdown. */
  readonly title: string;
  /**
   * The opening paragraph's markdown, which the site reads as the document's
   * description — `null` for a guide, whose intro stays whole.
   */
  readonly lede: string | null;
  /**
   * Everything above the first section bar the lede, which the compiler holds
   * to prose: a table there reaches no page, so it is an error rather than a
   * silent drop.
   */
  readonly intro: readonly DocProseBlock[];
  /**
   * The headings the intro carries, which the corpus does hold — one guide
   * opens with four `h3`s before its first section, and cross-page fragments
   * point at them.
   */
  readonly introHeadings: readonly DocHeading[];
  readonly sections: readonly DocSection[];
}

/** One ambiguity in one document, addressed by path and line. */
export interface DocProblem {
  readonly path: string;
  readonly line: number;
  readonly message: string;
}

export declare class DocCompileError extends Error {
  readonly problems: readonly DocProblem[];
  constructor(problems: readonly DocProblem[]);
}

export interface DocLocation {
  readonly path: string;
  readonly slug: string;
  readonly kind: DocKind;
}

export declare const FENCE_LANGUAGE_NAMES: readonly string[];

export declare function resolveFenceLanguage(lang: string | undefined): string | null;

export declare function compileDocument(source: string, location: DocLocation): DocDocument;

export declare function anchorsOf(document: DocDocument): readonly string[];

export declare function cellsOf(table: DocTable): {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
};
