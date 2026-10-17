export interface TopLevelSideEffect {
  readonly line: number;
  readonly text: string;
}

export declare function topLevelSideEffects(
  source: string,
  fileName?: string,
): TopLevelSideEffect[];
