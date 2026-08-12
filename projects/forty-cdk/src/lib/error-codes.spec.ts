import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
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
 * The one file allowed to spell a `[forty-cdk/…]` prefix and to call
 * `console.warn`: it is the module that owns both. Everything else reaches them
 * through `formatFortyMessage` / `fortyWarn`.
 */
const LAYOUT_MODULE = 'core/src/errors/errors.ts';

/**
 * The internal-tier entry points. Both declare `FORCDK-CORE-*` — the area is
 * the consumer-facing concern, and `forty-cdk/core-overlay` is no more a
 * concern a consumer imported from than `forty-cdk/core` is.
 */
const INTERNAL_TIER: ReadonlySet<string> = new Set(['core', 'core-overlay']);

/**
 * Modules in the internal tier that report on behalf of a concern other than
 * `core`, with the reason. The tier hosts machinery that is shared by
 * implementation but belongs, from a consumer's point of view, to one
 * primitive — so its codes carry that primitive's area while the file lives
 * here. Everything else in the tier declares `CORE`.
 *
 * A named condition rather than a blanket "core may declare anything": the
 * final case fails on a stale entry, so a module that stops declaring the area
 * claimed for it cannot leave the exemption behind.
 */
const CORE_CROSS_CONCERN: Readonly<Record<string, string>> = {
  'core-overlay/src/drawer-stack/drawer-stack.ts':
    'the drawer stack is drawer-only machinery that lives in core so nesting is coordinated app-wide',
  'core-overlay/src/menu-overlay/menu-context.ts':
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
    ([path, text]) =>
      [path.replace(/^\/projects\/forty-cdk\//, ''), stripComments(text as string)] as const,
  )
  .filter(([path]) => !path.endsWith('.spec.ts'))
  .sort(([a], [b]) => a.localeCompare(b));

/** Every entry point the glob reaches — the set a reporting scope must name. */
const entryPoints = new Set(libraryFiles.map(([source]) => source.slice(0, source.indexOf('/'))));

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

/**
 * Emitter call sites, whether or not they went on to declare a code.
 *
 * The body window is bounded so the scan cannot run away, and the bound is why
 * the next case exists: at 400 characters it silently skipped 18 of the 128
 * calls — every one of them a message carrying both a `cause` and a `fix`,
 * which is precisely where a field is easiest to forget. A window that is too
 * small does not fail, it just stops looking, so the count is pinned against
 * the raw call sites below.
 */
const emitterCalls = libraryFiles.flatMap(([source, text]) =>
  [
    ...text.matchAll(new RegExp(`\\b(${EMITTERS.join('|')})\\(\\{([\\s\\S]{0,1200}?)\\}\\)`, 'g')),
  ].map((m) => ({ source, emitter: m[1]!, body: m[2]! })),
);

/**
 * The same calls counted without reading their argument — a call is any
 * mention of an emitter that is not its own `function` declaration.
 */
const rawEmitterCalls = libraryFiles.flatMap(([source, text]) =>
  [...text.matchAll(new RegExp(`(?<!function )\\b(${EMITTERS.join('|')})\\(`, 'g'))].map((m) => ({
    source,
    emitter: m[1]!,
  })),
);

/**
 * Every literal reporting scope in library source, with where it came from.
 *
 * The code derives its own `[forty-cdk/<scope>]` prefix, which is the whole
 * point of the scheme — but a **shared** check reports under the primitive that
 * ran it, and that primitive's name is typed by hand at the call site. So the
 * one field the scheme removed comes back for those, and nothing but this case
 * checks it: a typo prints `[forty-cdk/date_picker]` and no test notices.
 *
 * The four shapes are the ones in use; a scope passed some other way is not
 * covered, which is a known gap rather than a closed one.
 */
const scopeLiterals = libraryFiles.flatMap(([source, text]) => {
  const found: Array<{ source: string; value: string; shape: string }> = [];
  const collect = (pattern: RegExp, shape: string): void => {
    for (const match of text.matchAll(pattern)) {
      found.push({ source, value: match[1]!, shape });
    }
  };
  collect(/\bscope:\s*'([^']*)'/g, 'scope:');
  collect(/\bprimitive:\s*'([^']*)'/g, 'primitive:');
  collect(/\bentryPoint:\s*'([^']*)'/g, 'entryPoint:');
  collect(/\bentryPoint\s*=\s*'([^']*)'/g, 'entryPoint =');
  collect(/\bassertInputBound\(\s*[^,]+,\s*'([^']*)'/g, 'assertInputBound');
  return found;
});

describe('FORCDK error codes', () => {
  it('scans a library that actually emits codes, so a broken glob cannot pass silently', () => {
    expect(sites.length).toBeGreaterThan(100);
    expect(emitterCalls.length).toBeGreaterThan(100);
    expect(entryPoints.size).toBeGreaterThan(40);
  });

  it('reads the argument of every emitter call, so none escapes the scan unseen', () => {
    // Equality, not a floor: a call whose body outgrows the window would drop
    // out of `emitterCalls` and take its own coverage with it, silently.
    expect(emitterCalls.length).toBe(rawEmitterCalls.length);
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
    // Keyed on every site rather than on the set of files: two distinct
    // failures sharing a code inside one module are the same defect as two
    // across modules, and deduping by file is what hid them.
    const byCode = new Map<string, string[]>();
    for (const site of sites) {
      byCode.set(site.code, [...(byCode.get(site.code) ?? []), site.source]);
    }
    const duplicated = [...byCode]
      .filter(([, sources]) => sources.length > 1)
      .map(([code, sources]) => `${code}: ${sources.join(', ')}`);

    expect(duplicated).toEqual([]);
  });

  it("names the consumer's own entry point in the area, outside the internal tier", () => {
    const mismatched = sites
      .filter((site) => !INTERNAL_TIER.has(site.entryPoint) && site.area !== site.entryPoint)
      .map((site) => `${site.source} → ${site.code} (area "${site.area}")`);

    expect(mismatched).toEqual([]);
  });

  it('keeps the internal tier on CORE, except for the modules whose concern is a named primitive', () => {
    const offenders = sites
      .filter((site) => INTERNAL_TIER.has(site.entryPoint) && site.area !== 'core')
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

  it('reports every scope override under a real entry point', () => {
    const unknown = scopeLiterals
      .filter((scope) => !entryPoints.has(scope.value))
      .map((scope) => `${scope.source} → ${scope.shape} '${scope.value}'`);

    expect(unknown).toEqual([]);
  });

  it('routes every prefixed message through the helpers, so none is hand-built', () => {
    // Any literal prefix, not only one inside a `throw new Error(`: the two
    // that survived the migration were passed as an argument to a core seam,
    // where a throw-shaped scan could not see them.
    const handBuilt = libraryFiles
      .filter(([source]) => source !== LAYOUT_MODULE)
      .filter(([, text]) => /\[forty-cdk\//.test(text))
      .map(([source]) => source);

    expect(handBuilt).toEqual([]);
  });

  it('leaves no bare console.warn in library source', () => {
    const bare = libraryFiles
      .filter(([source]) => source !== LAYOUT_MODULE)
      .filter(([, text]) => /\bconsole\.warn\(/.test(text))
      .map(([source]) => source);

    expect(bare).toEqual([]);
  });
});
