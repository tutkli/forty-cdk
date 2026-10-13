import { stripComments, SUITE_SOURCES } from '../test-utils/source-scan';

const SELF = 'src/lib/spec-code-readers.spec.ts';

const RAW_SPEC_READERS: Readonly<Record<string, string>> = {
  'src/lib/source-glob-shape.spec.ts':
    'it scans every file for import.meta.glob call sites, which is a question about the raw text',
};

const GUARD_CODE: ReadonlyArray<readonly [string, string]> = [...SUITE_SOURCES]
  .filter(([path]) => path.startsWith('src/lib/') && path !== SELF)
  .map(([path, source]) => [path, stripComments(source)] as const);

const readersOf = (name: RegExp): string[] =>
  GUARD_CODE.filter(([, code]) => name.test(code))
    .map(([path]) => path)
    .sort();

describe('spec readers count calls in SPEC_CODE', () => {
  it('finds the guards that read entry-point specs', () => {
    expect(readersOf(/\bSPEC_CODE\b/).length).toBeGreaterThanOrEqual(7);
  });

  it('reads raw spec text only where the guard is about the raw text', () => {
    const unexpected = readersOf(/\bSPEC_SOURCES\b/).filter(
      (path) => RAW_SPEC_READERS[path] === undefined,
    );

    expect(unexpected).toEqual([]);
  });

  it('declares no raw reader that no longer reads raw spec text', () => {
    const readers = new Set(readersOf(/\bSPEC_SOURCES\b/));
    const stale = Object.keys(RAW_SPEC_READERS).filter((path) => !readers.has(path));

    expect(stale).toEqual([]);
  });
});
