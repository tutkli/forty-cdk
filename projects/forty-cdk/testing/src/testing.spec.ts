import * as testing from 'forty-cdk/testing';

import { LIBRARY_CODE, SPEC_SOURCES, SUITE_SOURCES } from '../../src/test-utils/source-scan';

const RUNTIME_EXPORTS = [
  'pressKey',
  'pointerEvent',
  'pressWithMouse',
  'installObserverPolyfills',
  'withReducedMotion',
  'withFlippableReducedMotion',
  'createForDialogRef',
  'provideForDialogTesting',
  'createForDrawerRef',
  'provideForDrawerTesting',
];

const RUNNER_SPECIFIER =
  /\bfrom\s+['"](?:vitest(?:\/[^'"]*)?|@vitest\/[^'"]+|jest|@jest\/[^'"]+|jasmine(?:-core)?|@angular\/[a-z-]+\/testing)['"]|\brequire\(\s*['"](?:vitest|jest)/;

const ownSources = [...LIBRARY_CODE].filter(([path]) => path.startsWith('testing/src/'));

describe('forty-cdk/testing', () => {
  it('exports every helper it documents, and nothing else at runtime', () => {
    expect(Object.keys(testing).sort()).toEqual([...RUNTIME_EXPORTS].sort());
  });

  it('imports no test runner from any of its sources', () => {
    expect(ownSources.length).toBeGreaterThanOrEqual(7);
    expect(RUNNER_SPECIFIER.test("import { vi } from 'vitest';")).toBe(true);
    expect(RUNNER_SPECIFIER.test("import { TestBed } from '@angular/core/testing';")).toBe(true);
    const offenders = ownSources.filter(([, code]) => RUNNER_SPECIFIER.test(code));

    expect(offenders.map(([path]) => path)).toEqual([]);
  });

  it('is the only module declaring the helpers it publishes', () => {
    const declaration = new RegExp(
      `\\bexport\\s+(?:async\\s+)?function\\s+(?:${RUNTIME_EXPORTS.join('|')})\\b`,
    );
    for (const name of RUNTIME_EXPORTS) {
      const own = new RegExp(`\\bexport\\s+function\\s+${name}\\b`);
      expect(
        ownSources.some(([, code]) => own.test(code)),
        name,
      ).toBe(true);
    }
    const elsewhere = [...LIBRARY_CODE, ...SUITE_SOURCES, ...SPEC_SOURCES].filter(
      ([path, code]) => !path.startsWith('testing/src/') && declaration.test(code),
    );

    expect(elsewhere.map(([path]) => path)).toEqual([]);
  });
});
