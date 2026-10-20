import {
  rawRootInjectableCount,
  rawTokenCount,
  rootSingletonClasses,
  tokenDefinitions,
} from '../../../../scripts/lib/entrypoint-dedup.mjs';

const lines = (...source: readonly string[]) => source.join('\n');

describe('check-entrypoint-dedup singleton universe', () => {
  const source = lines(
    "import { Component, Injectable } from '@angular/core';",
    "@Injectable({ providedIn: 'root' })",
    'export class Exported {}',
    "@Injectable({ providedIn: 'root' })",
    'class NotExported {}',
    "@Injectable({ providedIn: 'root' })",
    'export abstract class Abstract {}',
    "@Injectable({ providedIn: 'root' })",
    '/**',
    ` * ${'A JSDoc block long enough to push the class keyword well past any fixed window. '.repeat(3)}`,
    ' */',
    'export class LongGap {}',
    '@Injectable({',
    "  providedIn: 'root',",
    '})',
    'export class MultiLine {}',
    "@Injectable({ providedIn: 'platform' })",
    'export class Platform {}',
    '@Injectable()',
    'export class Unprovided {}',
    "@Component({ selector: 'for-x', template: '' })",
    'export class NotInjectable {}',
  );

  it('derives every root-provided class, exported or not, abstract or not, however far its decorator sits', () => {
    expect(rootSingletonClasses(source)).toEqual([
      'Exported',
      'NotExported',
      'Abstract',
      'LongGap',
      'MultiLine',
    ]);
  });

  it('agrees with the raw decorator count the gate pins it against', () => {
    expect(rawRootInjectableCount(source)).toBe(rootSingletonClasses(source).length);
  });
});

describe('check-entrypoint-dedup token universe', () => {
  it('names every top-level token definition and counts the one that is not', () => {
    const bundle = lines(
      "const FOR_A = new InjectionToken('FOR_A');",
      "const FOR_B = /* @__PURE__ */ new InjectionToken('FOR_B');",
      "let FOR_C = new InjectionToken('FOR_C', { providedIn: 'root', factory: () => 0 });",
      "register(new InjectionToken('anonymous'));",
    );

    expect(tokenDefinitions(bundle)).toEqual(['FOR_A', 'FOR_B', 'FOR_C']);
    expect(rawTokenCount(bundle)).toBe(4);
  });
});
