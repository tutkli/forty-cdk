import { LIBRARY_SOURCES, SPEC_SOURCES, SUITE_SOURCES } from '../test-utils/source-scan';

/** Every `.ts` file in the library: entry-point sources, their specs, and the suite's own. */
const SCANNED: ReadonlyArray<readonly [string, string]> = [
  ...LIBRARY_SOURCES,
  ...SPEC_SOURCES,
  ...SUITE_SOURCES,
].sort(([a], [b]) => a.localeCompare(b));

/**
 * Captures the pattern of a glob call in any of the three quote forms. Vite
 * requires a static literal, so there is no fourth shape a call could take — and
 * the count below pins that claim against the raw call sites rather than
 * asserting it.
 */
const GLOB_PATTERN = /import\.meta\.glob\(\s*(['"`])([^'"`]+)\1/g;

const GLOB_CALL_SITE = /import\.meta\.glob\(/g;

const ROOT_ABSOLUTE = '/projects/forty-cdk/';

/** The one module allowed to read library source through a glob. */
const SHARED_SCANNER = 'src/test-utils/source-scan.ts';

/** `<file>` → the pattern of every `import.meta.glob` call it makes. */
function globPatterns(): ReadonlyArray<readonly [string, string]> {
  const found: Array<readonly [string, string]> = [];
  for (const [path, source] of SCANNED) {
    for (const match of source.matchAll(GLOB_PATTERN)) {
      found.push([path, match[2]!] as const);
    }
  }
  return found;
}

function callSiteCount(): number {
  return SCANNED.reduce(
    (total, [, source]) => total + [...source.matchAll(GLOB_CALL_SITE)].length,
    0,
  );
}

/**
 * Every source-reading glob is written **root-absolute**, and lives in the one
 * shared scanner ([#1788](https://github.com/tutkli/forty-cdk/issues/1788),
 * [#1790](https://github.com/tutkli/forty-cdk/issues/1790)).
 *
 * A relative pattern resolves against the importer's directory, and under
 * `--coverage` the importer is no longer the spec file: `@angular/build`'s
 * `angular:test-in-memory-provider` plugin replaces the spec's virtual module
 * with `import "./<entry-point>.js"` so the coverage provider can exclude the
 * test file itself, and that intermediate chunk resolves against the workspace
 * root. A `../../` pattern then climbs out of the root and matches nothing, so
 * the roster specs report zero library sources and fail on their own liveness
 * probes — `expected 0 to be greater than 100`. A pattern starting with `/`
 * resolves against Vite's `root`, which the builder pins to the workspace root
 * in both modes, so the same sources are found either way.
 *
 * Nothing else in the suite reports this: without `--coverage` a relative
 * pattern works, so a new glob written that way is green under `pnpm test` and
 * fails only the coverage run, which is not a gate. This case is therefore the
 * gate, and it derives the set rather than listing it.
 *
 * **Root-absolute is what made the fold possible, and the fold is what makes
 * this gate narrow enough to be exact.** Because the pattern no longer depends
 * on the file it is written in, every roster reads its sources from
 * `src/test-utils/source-scan.ts` instead of declaring its own — so the case
 * below asks not merely that each pattern is absolute but that there is only
 * one module writing any, which is the property `scripts/run-coverage.mjs`
 * cannot check for itself: it excludes a spec whose pattern is relative, and a
 * relative pattern in the shared scanner would break every roster at once with
 * no spec to exclude.
 */
describe('source-reading globs', () => {
  it('scans every source file and spec in the library', () => {
    expect(SCANNED.length).toBeGreaterThan(800);
  });

  it('extracts a pattern from every glob call site', () => {
    expect(globPatterns().length).toBe(callSiteCount());
  });

  it('reads library source through one module and no other', () => {
    const declaring = [...new Set(globPatterns().map(([path]) => path))].sort();

    expect(declaring).toEqual([SHARED_SCANNER]);
  });

  it('writes every glob pattern root-absolute so it resolves under --coverage', () => {
    const relative = globPatterns()
      .filter(([, pattern]) => !pattern.startsWith(ROOT_ABSOLUTE))
      .map(([path, pattern]) => `${path}: ${pattern}`);

    expect(relative).toEqual([]);
  });
});
