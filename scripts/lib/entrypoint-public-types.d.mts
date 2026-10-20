import type ts from 'typescript';

export interface EntrypointPublicTypes {
  readonly unblessed: string[];
  readonly reexported: ReadonlySet<string>;
  readonly reexportsAll: boolean;
  readonly leaked: string[];
}

export declare const CORE_SPECIFIERS: ReadonlySet<string>;

export declare function declaredNames(
  stmt: ts.Statement,
): Array<{ readonly name: string; readonly node: ts.Node }>;

export declare function analyze(fileName: string, text: string): EntrypointPublicTypes;
