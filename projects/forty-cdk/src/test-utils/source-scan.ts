/**
 * The library's own source text, read once and shared by every guard in the
 * suite that derives a roster from it
 * ([#1790](https://github.com/tutkli/forty-cdk/issues/1790)).
 *
 * Fifteen specs used to declare their own glob, their own key normaliser and —
 * for ten of them — their own idea of what a comment is, in four variants that
 * disagreed in **opposite** directions: two stripped any `//`, including one
 * inside a string literal, while a third stripped only whole-line comments so a
 * trailing one survived into the scanned text. Both directions fail the same
 * silent way a derived roster exists to avoid, because a guard that misses a
 * line reports *less* adoption and its coverage assertion then passes for the
 * wrong reason.
 *
 * The globs live here rather than in each spec because
 * [#1789](https://github.com/tutkli/forty-cdk/issues/1789) made every pattern
 * root-absolute: a pattern starting with `/` resolves against Vite's `root`,
 * which the builder pins to the workspace root in both the plain and the
 * `--coverage` run, so it no longer matters which file the call is written in.
 * [`src/lib/source-glob-shape.spec.ts`](../lib/source-glob-shape.spec.ts) is
 * what keeps this the only module declaring one — a relative pattern here would
 * break every roster at once under coverage, and `scripts/run-coverage.mjs`
 * could not exclude its way out of that the way it can for a single spec.
 */

const ENTRY_POINT_FILES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SUITE_FILES = import.meta.glob('/projects/forty-cdk/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const README_FILES = import.meta.glob('/projects/forty-cdk/*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const GUIDE_FILES = import.meta.glob('/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const ROOT = '/projects/forty-cdk/';

/**
 * The glob's records keyed by repository path relative to the library root, in
 * the glob's own order. Nothing re-sorts: the keys a roster reports and the
 * order it reports them in are the ones every one of these guards already saw.
 */
function sourcesFrom(
  files: Record<string, string>,
  keep: (path: string) => boolean,
): ReadonlyMap<string, string> {
  const entries: Array<readonly [string, string]> = [];
  for (const [key, source] of Object.entries(files)) {
    const path = key.slice(ROOT.length);
    if (keep(path)) {
      entries.push([path, source] as const);
    }
  }
  return new Map(entries);
}

const isSpec = (path: string): boolean => path.endsWith('.spec.ts');

const REGEX_PRECEDING_KEYWORDS =
  /^(?:await|case|delete|do|else|in|instanceof|new|of|return|throw|typeof|void|yield)$/;

/**
 * Every source file the library ships, keyed `<entry-point>/src/<file>.ts`.
 *
 * Specs are excluded — this is the text a roster derives a family from. Comments
 * are **intact**; scan {@link LIBRARY_CODE} instead when prose naming a symbol
 * must not read as a use of it.
 */
export const LIBRARY_SOURCES: ReadonlyMap<string, string> = sourcesFrom(
  ENTRY_POINT_FILES,
  (path) => !isSpec(path),
);

/**
 * {@link LIBRARY_SOURCES} with every comment removed, which is what a scan for a
 * call site, a host binding or a heritage clause reads.
 */
export const LIBRARY_CODE: ReadonlyMap<string, string> = new Map(
  [...LIBRARY_SOURCES].map(([path, source]) => [path, stripComments(source)] as const),
);

/**
 * Every entry-point spec, keyed `<entry-point>/src/<file>.spec.ts`.
 *
 * This is the half a roster counts contract calls in. The suite's own specs
 * under `src/` are deliberately **not** here: an adoption guard keys its claims
 * on the primitive spec that owns them, and a meta-guard quoting a contract's
 * name in its own source would join the roster it derives. Reach for
 * {@link SUITE_SOURCES} when the subject genuinely is the whole suite.
 */
export const SPEC_SOURCES: ReadonlyMap<string, string> = sourcesFrom(ENTRY_POINT_FILES, isSpec);

export const SPEC_CODE: ReadonlyMap<string, string> = new Map(
  [...SPEC_SOURCES].map(([path, source]) => [path, stripComments(source)] as const),
);

/**
 * Every file under `projects/forty-cdk/src/`, specs and helpers alike, keyed
 * `src/<file>.ts` — the cross-cutting suite plus these test utilities, this
 * module included.
 */
export const SUITE_SOURCES: ReadonlyMap<string, string> = sourcesFrom(SUITE_FILES, () => true);

/**
 * Every entry point's README, keyed `<entry-point>/README.md` — the markup a
 * consumer copies, which is what a roster reads when its family is defined by
 * the element a piece is documented on rather than by anything in its source.
 */
export const README_SOURCES: ReadonlyMap<string, string> = sourcesFrom(README_FILES, () => true);

export const GUIDE_SOURCES: ReadonlyMap<string, string> = new Map(
  Object.entries(GUIDE_FILES).map(([key, source]) => [key.slice(1), source] as const),
);

/**
 * The entry point a path belongs to: `dialog/src/dialog.ts` → `dialog`. A suite
 * file answers `src`, which is what tells the two apart.
 */
export function entryPointOf(path: string): string {
  return path.split('/')[0]!;
}

/**
 * The entry points that make up the internal core tier. They are imported by
 * the primitives rather than by consumers, so nothing they export is public.
 */
const INTERNAL_TIER_ENTRY_POINTS: ReadonlySet<string> = new Set([
  'core',
  'core-overlay',
  'core-anchored',
]);

/** A directive or component a consumer can import from a public entry point. */
export interface PublicDirective {
  /** The exported class name, `For`-prefixed. */
  readonly name: string;
  /** The entry point whose barrel exports it. */
  readonly entryPoint: string;
  /** The file declaring the class, keyed like {@link LIBRARY_SOURCES}. */
  readonly source: string;
}

const DECORATED_CLASS = /@(?:Directive|Component)\(/g;
const NEXT_EXPORTED_CLASS = /\bexport\s+(?:abstract\s+)?class\s+(\w+)/g;
const BARREL_EXPORT = /\bexport\s+(type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g;

/** The class each `@Directive` / `@Component` decorator in a file decorates. */
function decoratedClasses(code: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const decorator of code.matchAll(DECORATED_CLASS)) {
    NEXT_EXPORTED_CLASS.lastIndex = decorator.index;
    const declaration = NEXT_EXPORTED_CLASS.exec(code);
    if (declaration !== null) names.add(declaration[1]!);
  }
  return names;
}

function resolveBarrelSpecifier(entryPoint: string, specifier: string): string | undefined {
  const base = `${entryPoint}/src/${specifier.replace(/^\.\//, '')}`;
  return [`${base}.ts`, `${base}/index.ts`].find((path) => LIBRARY_CODE.has(path));
}

/**
 * Every `For*` directive and component a public entry point's barrel
 * re-exports, derived from source: a value export of an
 * `<entry-point>/src/public-api.ts` whose declaring file decorates it with
 * `@Directive` or `@Component`. Tokens, refs, managers, functions and types
 * drop out by construction, and so does the internal core tier. A class the
 * barrel reaches through another module or another entry point's specifier is
 * resolved to the file declaring it. Each name is reported once, against the
 * first barrel exporting it.
 */
export function publicDirectiveRoster(): readonly PublicDirective[] {
  const declaredIn = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    for (const name of decoratedClasses(code)) declaredIn.set(name, path);
  }

  const roster = new Map<string, PublicDirective>();
  for (const [path, code] of LIBRARY_CODE) {
    const entryPoint = entryPointOf(path);
    if (path !== `${entryPoint}/src/public-api.ts`) continue;
    if (INTERNAL_TIER_ENTRY_POINTS.has(entryPoint)) continue;
    for (const [, typeOnly, list, specifier] of code.matchAll(BARREL_EXPORT)) {
      if (typeOnly !== undefined) continue;
      const file = specifier!.startsWith('.')
        ? resolveBarrelSpecifier(entryPoint, specifier!)
        : undefined;
      for (const raw of list!.split(',')) {
        const entry = raw.trim();
        if (entry === '' || entry.startsWith('type ')) continue;
        const [local, exported = local] = entry.split(/\s+as\s+/).map((part) => part.trim());
        if (!exported!.startsWith('For') || roster.has(exported!)) continue;
        const source =
          file !== undefined && decoratedClasses(LIBRARY_CODE.get(file)!).has(local!)
            ? file
            : declaredIn.get(local!);
        if (source === undefined) continue;
        roster.set(exported!, { name: exported!, entryPoint, source });
      }
    }
  }
  return [...roster.values()];
}

/**
 * Source with its comments removed, so prose naming a symbol never reads as a
 * use of it — the anchoring failure the marker rules hit in
 * [#1606](https://github.com/tutkli/forty-cdk/issues/1606).
 *
 * Block comments go entirely and a `//` comment runs to the end of its line.
 * String, template and regex literals are copied verbatim, so a `//` or a `/*`
 * inside one is text rather than the start of a comment and nothing after it is
 * lost. A `/` opens a regex where an expression can start — after punctuation
 * other than `)` and `]`, or after a keyword such as `return` — and divides
 * anywhere else.
 */
export function stripComments(source: string): string {
  const templateDepths: number[] = [];
  let out = '';
  let at = 0;
  let depth = 0;
  let regexAllowed = true;

  const copyTo = (end: number): void => {
    out += source.slice(at, end);
    at = end;
  };

  const copyQuoted = (quote: string): void => {
    let end = at + 1;
    while (end < source.length && source[end] !== quote && source[end] !== '\n') {
      end += source[end] === '\\' ? 2 : 1;
    }
    copyTo(Math.min(end + 1, source.length));
    regexAllowed = false;
  };

  const copyTemplate = (): void => {
    let end = at;
    while (end < source.length) {
      const char = source[end];
      if (char === '\\') {
        end += 2;
      } else if (char === '`') {
        copyTo(end + 1);
        regexAllowed = false;
        return;
      } else if (char === '$' && source[end + 1] === '{') {
        copyTo(end + 2);
        templateDepths.push(depth);
        regexAllowed = true;
        return;
      } else {
        end += 1;
      }
    }
    copyTo(source.length);
  };

  const copyRegex = (): void => {
    let end = at + 1;
    let inClass = false;
    while (end < source.length && source[end] !== '\n') {
      const char = source[end];
      end += char === '\\' ? 2 : 1;
      if (char === '[') {
        inClass = true;
      } else if (char === ']') {
        inClass = false;
      } else if (char === '/' && !inClass) {
        break;
      }
    }
    while (end < source.length && /[a-z]/i.test(source[end]!)) {
      end += 1;
    }
    copyTo(end);
    regexAllowed = false;
  };

  const copyWord = (): void => {
    let end = at;
    while (end < source.length && /[\w$#]/.test(source[end]!)) {
      end += 1;
    }
    const word = source.slice(at, end);
    copyTo(end);
    regexAllowed = REGEX_PRECEDING_KEYWORDS.test(word);
  };

  while (at < source.length) {
    const char = source[at]!;
    const next = source[at + 1];
    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', at);
      at = end === -1 ? source.length : end;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', at + 2);
      at = end === -1 ? source.length : end + 2;
    } else if (char === '/' && regexAllowed) {
      copyRegex();
    } else if (char === "'" || char === '"') {
      copyQuoted(char);
    } else if (char === '`') {
      copyTo(at + 1);
      copyTemplate();
    } else if (char === '}' && templateDepths.at(-1) === depth) {
      templateDepths.pop();
      copyTo(at + 1);
      copyTemplate();
    } else if (/[\w$#]/.test(char)) {
      copyWord();
    } else {
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }
      copyTo(at + 1);
      if (!/\s/.test(char)) {
        regexAllowed = char !== ')' && char !== ']';
      }
    }
  }
  return out;
}
