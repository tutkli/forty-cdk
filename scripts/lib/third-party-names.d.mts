export interface ThirdPartyName {
  readonly name: string;
  readonly pattern: RegExp;
}

export interface ThirdPartyExemption {
  readonly name: string;
  readonly entryPoint: string;
  readonly reason: string;
}

export interface LineOrigin {
  readonly path: string;
  readonly entryPoint: string | null;
}

export interface ScannedLine extends LineOrigin {
  readonly line: number;
  readonly text: string;
}

export interface ThirdPartyOptions {
  readonly names?: readonly ThirdPartyName[];
  readonly exemptions?: readonly ThirdPartyExemption[];
}

export interface ThirdPartyResult {
  readonly problems: readonly string[];
  readonly exempted: number;
}

export declare const THIRD_PARTY_NAMES: readonly ThirdPartyName[];

export declare const THIRD_PARTY_EXEMPTIONS: readonly ThirdPartyExemption[];

export declare function markdownLines(markdown: string, origin: LineOrigin): ScannedLine[];

export declare function jsdocLines(source: string, origin: LineOrigin): ScannedLine[];

export declare function thirdPartyProblems(
  lines: readonly ScannedLine[],
  options?: ThirdPartyOptions,
): ThirdPartyResult;
