import { LIBRARY_SOURCES } from '../test-utils/source-scan';

const RETIRED_INTERNAL_DIRECTORY = /\b_internal\//;

describe('retired source paths in library sources (#2386)', () => {
  it('reads the library sources', () => {
    expect(LIBRARY_SOURCES.size).toBeGreaterThan(400);
  });

  it('names no path under the removed _internal/ directory', () => {
    const offenders = [...LIBRARY_SOURCES]
      .filter(([, source]) => RETIRED_INTERNAL_DIRECTORY.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
