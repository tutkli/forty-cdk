import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob('../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Library-wide guard on the `FORCDK-<AREA>-<NNN>` error-code scheme.
 *
 * Every developer-facing message the library emits goes through `fortyError`,
 * `fortyWarn`, or one of the two shape helpers built on them, and each call
 * declares a code. The code is the stable identity of one concrete failure: it
 * is what a consumer searches for, so it must never be reused for a second
 * meaning and never appear twice.
 *
 * The roster is **derived** rather than declared — a hand-maintained list of a
 * hundred codes is exactly the shape that rots. What the cases below pin is the
 * scheme itself, which is enough to make the two mistakes that matter loud: a
 * duplicated code (two failures a consumer cannot tell apart) and an area that
 * does not name the entry point the consumer imported from.
 *
 * Numbers are deliberately **not** required to be gap-free. Retiring a failure
 * frees its number, and reusing it would break the one property the scheme
 * exists for.
 */

/** Emitters whose first argument declares the code. */
const EMITTERS = ['fortyError', 'fortyWarn', 'orphanContextError', 'unresolvedRootError'];

const CODE_PATTERN = /^FORCDK-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}$/;

/**
 * Modules in `forty-cdk/core` that report on behalf of a concern other than
 * `core`, with the reason. Core hosts machinery that is shared by
 * implementation but belongs, from a consumer's point of view, to one
 * primitive — so its codes carry that primitive's area while the file lives
 * here. Everything else in core declares `CORE`.
 *
 * A named condition rather than a blanket "core may declare anything": the
 * final case fails on a stale entry, so a module that stops declaring the area
 * claimed for it cannot leave the exemption behind.
 */
const CORE_CROSS_CONCERN: Readonly<Record<string, string>> = {
  'core/src/drawer-stack/drawer-stack.ts':
    'the drawer stack is drawer-only machinery that lives in core so nesting is coordinated app-wide',
  'core/src/menu-overlay/menu-context.ts':
    'the shared menu context backs every menu-family root, and a consumer reads it as `menu`',
};

interface CodeSite {
  /** Entry-point-relative source path, e.g. `dialog/src/dialog-context.ts`. */
  readonly source: string;
  /** The entry point directory the file lives in. */
  readonly entryPoint: string;
  /** The declared code. */
  readonly code: string;
  /** The code's area segment, lowercased — `FORCDK-DATE-PICKER-001` → `date-picker`. */
  readonly area: string;
}

function areaOf(code: string): string {
  return code.slice('FORCDK-'.length, code.lastIndexOf('-')).toLowerCase();
}

/**
 * Drops block comments and whole-line `//` comments.
 *
 * A JSDoc example is prose, not a declaration — `fortyError`'s own doc block
 * shows a real call, and counting it would report the helper as a second
 * claimant of the code it illustrates. This is the same anchor discipline the
 * marker rules learned the hard way: key on the construct, never on text that
 * merely quotes it. Only whole-line `//` is stripped, so a `//` inside a string
 * on a code line cannot swallow the rest of that line.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const libraryFiles = Object.entries(SOURCES)
  .map(
    ([path, text]) => [path.replace(/^\.\.\/\.\.\//, ''), stripComments(text as string)] as const,
  )
  .filter(([path]) => !path.endsWith('.spec.ts'))
  .sort(([a], [b]) => a.localeCompare(b));

const sites: CodeSite[] = [];
for (const [source, text] of libraryFiles) {
  for (const match of text.matchAll(/\bcode:\s*'([^']*)'/g)) {
    sites.push({
      source,
      entryPoint: source.slice(0, source.indexOf('/')),
      code: match[1]!,
      area: areaOf(match[1]!),
    });
  }
}

/** Emitter call sites, whether or not they went on to declare a code. */
const emitterCalls = libraryFiles.flatMap(([source, text]) =>
  [
    ...text.matchAll(new RegExp(`\\b(${EMITTERS.join('|')})\\(\\{([\\s\\S]{0,400}?)\\}\\)`, 'g')),
  ].map((m) => ({ source, emitter: m[1]!, body: m[2]! })),
);

describe('FORCDK error codes', () => {
  it('scans a library that actually emits codes, so a broken glob cannot pass silently', () => {
    expect(sites.length).toBeGreaterThan(100);
    expect(emitterCalls.length).toBeGreaterThan(100);
  });

  it('declares a code at every emitter call site', () => {
    // Any `code:` value, not only a literal: the two shape helpers forward
    // their caller's code, which is where the literal lives.
    const uncoded = emitterCalls
      .filter((call) => !/\bcode:\s*\S/.test(call.body))
      .map((call) => `${call.source} → ${call.emitter}`);

    expect(uncoded).toEqual([]);
  });

  it('spells every code as FORCDK-<AREA>-<NNN>', () => {
    const malformed = sites
      .filter((site) => !CODE_PATTERN.test(site.code))
      .map((site) => `${site.source} → ${site.code}`);

    expect(malformed).toEqual([]);
  });

  it('never spends one code on two failures', () => {
    const byCode = new Map<string, string[]>();
    for (const site of sites) {
      byCode.set(site.code, [...(byCode.get(site.code) ?? []), site.source]);
    }
    const duplicated = [...byCode]
      .filter(([, sources]) => new Set(sources).size > 1)
      .map(([code, sources]) => `${code}: ${[...new Set(sources)].join(', ')}`);

    expect(duplicated).toEqual([]);
  });

  it("names the consumer's own entry point in the area, outside core", () => {
    const mismatched = sites
      .filter((site) => site.entryPoint !== 'core' && site.area !== site.entryPoint)
      .map((site) => `${site.source} → ${site.code} (area "${site.area}")`);

    expect(mismatched).toEqual([]);
  });

  it('keeps core on CORE, except for the modules whose concern is a named primitive', () => {
    const offenders = sites
      .filter((site) => site.entryPoint === 'core' && site.area !== 'core')
      .filter((site) => !(site.source in CORE_CROSS_CONCERN))
      .map((site) => `${site.source} → ${site.code}`);

    expect(offenders).toEqual([]);
  });

  it('drops a cross-concern exemption once its module stops using one', () => {
    const stale = Object.keys(CORE_CROSS_CONCERN).filter(
      (source) => !sites.some((site) => site.source === source && site.area !== 'core'),
    );

    expect(stale).toEqual([]);
  });

  it('routes every prefixed message through the helpers, so none is hand-built', () => {
    const handBuilt = libraryFiles
      .filter(([, text]) => /throw new Error\(\s*[`'"]\[forty-cdk\//.test(text))
      .map(([source]) => source);

    expect(handBuilt).toEqual([]);
  });

  it('leaves no bare console.warn in library source', () => {
    const bare = libraryFiles
      .filter(([source]) => source !== 'core/src/errors/errors.ts')
      .filter(([, text]) => /\bconsole\.warn\(/.test(text))
      .map(([source]) => source);

    expect(bare).toEqual([]);
  });
});
