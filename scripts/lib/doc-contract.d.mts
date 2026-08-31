import type { DocDocument, DocMeta, DocSectionRing } from '../docs/doc-model.mjs';
import type { FrontmatterProblem } from './doc-frontmatter.mjs';

/** A frontmatter problem, addressed by the file it was written in. */
export interface DocMetaProblem extends FrontmatterProblem {
  readonly path: string;
}

export interface DocArchetype {
  readonly summary: string;
  readonly sections: readonly string[];
}

/** A required section a document deliberately omits, and the reason it does. */
export interface DocSectionExemption {
  readonly slug: string;
  readonly section: string;
  readonly reason: string;
}

export interface ReadDocMeta {
  /** `null` when any problem was found — the caller reports rather than publishes. */
  readonly meta: DocMeta | null;
  readonly body: string;
  readonly problems: readonly DocMetaProblem[];
}

export declare const DOC_GROUPS: ReadonlyMap<string, string | null>;

export declare const ARCHETYPES: ReadonlyMap<string, DocArchetype>;

export declare const CORE_SECTIONS: readonly string[];

export declare const CANONICAL_SECTIONS: readonly string[];

export declare const SECTION_EXEMPTIONS: readonly DocSectionExemption[];

/** The page and the section of it an unpublished README's content is appended to. */
export interface DocFoldTarget {
  readonly slug: string;
  readonly section: string;
}

export declare function foldTargetOf(meta: DocMeta): DocFoldTarget | null;

export declare function ringOf(title: string): DocSectionRing;

export declare function readDocMeta(source: string, path: string): ReadDocMeta;

export declare function requiredSections(meta: DocMeta, slug: string): readonly string[];

export declare function checkSections(documents: readonly DocDocument[]): readonly DocMetaProblem[];

export declare function checkExemptions(
  documents: readonly DocDocument[],
): readonly DocMetaProblem[];

export declare function checkContract(documents: readonly DocDocument[]): readonly DocMetaProblem[];
