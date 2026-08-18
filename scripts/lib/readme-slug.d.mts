export declare function slugify(text: string): string;

export declare class Slugger {
  reset(): void;
  unique(base: string): string;
}

export declare function isFenceLine(line: string): boolean;

export declare function isTableDelimiter(line: string | undefined): boolean;
