const ENTRY_POINT_SPECS = import.meta.glob('/projects/forty-cdk/*/src/**/*.spec.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SUITE_SPECS = import.meta.glob('/projects/forty-cdk/src/**/*.spec.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SPEC_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries({
  ...ENTRY_POINT_SPECS,
  ...SUITE_SPECS,
})
  .map(([key, source]) => [key.replace(/^\/projects\/forty-cdk\//, ''), source] as const)
  .sort(([a], [b]) => a.localeCompare(b));

/**
 * Captures the pattern of a glob call in any of the three quote forms. Vite
 * requires a static literal, so there is no fourth shape a call could take — and
 * the count below pins that claim against the raw call sites rather than
 * asserting it.
 */
const GLOB_PATTERN = /import\.meta\.glob\(\s*(['"`])([^'"`]+)\1/g;

const GLOB_CALL_SITE = /import\.meta\.glob\(/g;

const ROOT_ABSOLUTE = '/projects/forty-cdk/';

/** `<spec file>` → the pattern of every `import.meta.glob` call it makes. */
function globPatterns(): ReadonlyArray<readonly [string, string]> {
  const found: Array<readonly [string, string]> = [];
  for (const [path, source] of SPEC_SOURCES) {
    for (const match of source.matchAll(GLOB_PATTERN)) {
      found.push([path, match[2]!] as const);
    }
  }
  return found;
}

function callSiteCount(): number {
  return SPEC_SOURCES.reduce(
    (total, [, source]) => total + [...source.matchAll(GLOB_CALL_SITE)].length,
    0,
  );
}

/**
 * Every source-reading glob is written **root-absolute**
 * ([#1788](https://github.com/tutkli/forty-cdk/issues/1788)).
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
 * pattern works, so a new roster spec written that way is green under
 * `pnpm test` and fails only the coverage run, which is not a gate. This case is
 * therefore the gate, and it derives the set rather than listing it.
 */
describe('source-reading globs', () => {
  it('scans every spec in the library', () => {
    expect(SPEC_SOURCES.length).toBeGreaterThan(200);
  });

  it('extracts a pattern from every glob call site', () => {
    expect(globPatterns().length).toBe(callSiteCount());
  });

  it('finds every source-reading glob call', () => {
    expect(globPatterns().length).toBeGreaterThanOrEqual(15);
  });

  it('writes every glob pattern root-absolute so it resolves under --coverage', () => {
    const relative = globPatterns()
      .filter(([, pattern]) => !pattern.startsWith(ROOT_ABSOLUTE))
      .map(([path, pattern]) => `${path}: ${pattern}`);

    expect(relative).toEqual([]);
  });
});
