export interface ProseOrigin {
  readonly path: string;
}

export interface ProseResult {
  readonly problems: readonly string[];
  readonly lines: number;
}

export declare const PROSE_FIX: string;

export declare function proseProblems(markdown: string, origin: ProseOrigin): ProseResult;
