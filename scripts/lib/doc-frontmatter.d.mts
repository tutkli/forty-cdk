/** One field's value: a scalar, or the items of a `[a, b]` list. */
export type FrontmatterValue = string | readonly string[];

export interface FrontmatterField {
  readonly value: FrontmatterValue;
  /** The line the field was written on, for the message that names it. */
  readonly line: number;
}

/** One malformed line, addressed by the line it was written on. */
export interface FrontmatterProblem {
  readonly line: number;
  readonly message: string;
}

export interface SplitFrontmatter {
  /** `null` when the document opens with no block, or the block never closes. */
  readonly fields: ReadonlyMap<string, FrontmatterField> | null;
  /** The source with the block's lines blanked, so line numbers stay true. */
  readonly body: string;
  readonly problems: readonly FrontmatterProblem[];
}

export declare function splitFrontmatter(source: string): SplitFrontmatter;
