import {
  GUIDE_SOURCES,
  LIBRARY_CODE,
  README_SOURCES,
  SUITE_SOURCES,
  entryPointOf,
} from '../test-utils/source-scan';

interface DecoratedClass {
  readonly name: string;
  readonly path: string;
  readonly component: boolean;
  readonly tokens: readonly string[];
  readonly helper: string | null;
}

interface Claim {
  readonly where: string;
  readonly classes: readonly string[];
  readonly tokens: readonly string[];
}

const NON_FORM_GUIDE = 'docs/wrapping-non-form-roots.md';
const FORM_GUIDE = 'docs/wrapping-form-primitives.md';
const GUARD_SPEC = 'src/lib/root-context-guard.spec.ts';

const DECORATED =
  /@(Directive|Component)\(\{([\s\S]*?)\n\}\)\s*export (?:abstract )?class (For\w+)/g;
const PROVIDERS = /\n {2}providers:\s*([\s\S]*?)(?=\n {2}\w+:|$)/;
const PROVIDERS_LINE = /^ {2}providers:/gm;
const PROVIDED_TOKEN = /provide:\s*(\w+)/g;
const HELPER_CALL = /^(provideFor\w+)\(/;
const CLASS_SPAN = /`(For[A-Z]\w*)`/g;
const TOKEN_SPAN = /`(FOR_[A-Z0-9_]+)`/g;
const HELPER_SPAN = /`(provideFor\w+)\(/g;
const CLAIM =
  /((?:`For[A-Z]\w*`(?:,? and |, | \/ ))*`For[A-Z]\w*`) \(((?:`FOR_[A-Z0-9_]+`(?:,? and |, ))*`FOR_[A-Z0-9_]+`)\)/g;
const TUPLE = /export const FOR_(\w+)_HOST_DIRECTIVE_INPUTS\b/g;
const SPLIT_PHRASE = 'split their coordination surface';

const sorted = (values: Iterable<string>): string[] => [...values].sort();
const spans = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].map((match) => match[1]!);
const collapsed = (text: string): string => text.replace(/\s+/g, ' ');
const pascal = (screaming: string): string =>
  screaming
    .toLowerCase()
    .split('_')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join('');

function guide(path: string): string {
  const text = GUIDE_SOURCES.get(path);
  if (text === undefined) {
    throw new Error(`${path} was not found`);
  }
  return text.replace(/\r\n/g, '\n');
}

function decoratedClasses(): ReadonlyMap<string, DecoratedClass> {
  const classes = new Map<string, DecoratedClass>();
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(DECORATED)) {
      const providers = PROVIDERS.exec(match[2]!)?.[1]?.trim() ?? null;
      classes.set(match[3]!, {
        name: match[3]!,
        path,
        component: match[1] === 'Component',
        tokens: providers === null ? [] : sorted(spans(providers, PROVIDED_TOKEN)),
        helper: providers === null ? null : (HELPER_CALL.exec(providers)?.[1] ?? null),
      });
    }
  }
  return classes;
}

function providersLineCount(): number {
  return [...LIBRARY_CODE.values()].reduce(
    (total, code) => total + [...code.matchAll(PROVIDERS_LINE)].length,
    0,
  );
}

function tableRows(text: string, header: RegExp): string[][] {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) {
    throw new Error(`no table with the header ${header}`);
  }
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) {
      break;
    }
    rows.push(
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

function allTableRows(text: string): string[][] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|\s*-/.test(line))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}

function proseClaims(path: string): Claim[] {
  return [...collapsed(guide(path)).matchAll(CLAIM)].map((match) => ({
    where: path,
    classes: spans(match[1]!, CLASS_SPAN),
    tokens: spans(match[2]!, TOKEN_SPAN),
  }));
}

function tableClaims(path: string, header: RegExp, tokenColumn: number): Claim[] {
  return tableRows(guide(path), header).map((cells) => ({
    where: path,
    classes: spans(cells[0]!, CLASS_SPAN),
    tokens: spans(cells[tokenColumn]!, TOKEN_SPAN),
  }));
}

function claims(): Claim[] {
  return [
    ...tableClaims(NON_FORM_GUIDE, /^\| Root\s+\| Tokens? to re-provide\s+\|$/, 1),
    ...tableClaims(FORM_GUIDE, /^\| Subclassed part\s+\|/, 2),
    ...proseClaims(NON_FORM_GUIDE),
    ...proseClaims(FORM_GUIDE),
  ];
}

function helperClaims(): Array<readonly [string, string]> {
  const pairs: Array<readonly [string, string]> = [];
  for (const path of [NON_FORM_GUIDE, FORM_GUIDE]) {
    for (const cells of allTableRows(guide(path))) {
      const helpers = cells.slice(1).flatMap((cell) => spans(cell, HELPER_SPAN));
      if (helpers.length === 0) {
        continue;
      }
      const classes = spans(cells[0]!, CLASS_SPAN);
      expect(classes, `${path}: ${cells[0]}`).toHaveLength(helpers.length);
      classes.forEach((name, index) => pairs.push([name, helpers[index]!] as const));
    }
  }
  return pairs;
}

function leafControls(): string[] {
  const sentence = /The pure leaf controls (.*?) declare no providers/.exec(
    collapsed(guide(FORM_GUIDE)),
  );
  if (!sentence) {
    throw new Error(`${FORM_GUIDE} no longer names its leaf controls`);
  }
  return spans(sentence[1]!, CLASS_SPAN);
}

function splitRootsInGuides(): string[] {
  return [NON_FORM_GUIDE, FORM_GUIDE].flatMap((path) => {
    const paragraph = guide(path)
      .split('\n\n')
      .find((block) => collapsed(block).includes(SPLIT_PHRASE));
    if (paragraph === undefined) {
      throw new Error(`${path} no longer names its split roots`);
    }
    return spans(collapsed(paragraph).split(SPLIT_PHRASE)[0]!, CLASS_SPAN);
  });
}

function guardedRoots(): string[] {
  const block = /const GUARDED: readonly GuardedRoot\[\] = \[([\s\S]*?)\n\];/.exec(
    SUITE_SOURCES.get(GUARD_SPEC) ?? '',
  );
  if (!block) {
    throw new Error(`${GUARD_SPEC} no longer declares its GUARDED roster`);
  }
  return [...block[1]!.matchAll(/root: '([^']+)'/g)].flatMap((root) =>
    [...root[1]!.matchAll(/\[for(\w+)\]/g)].map((selector) => `For${selector[1]!}`),
  );
}

function exportedTuples(): string[] {
  return [...LIBRARY_CODE.values()].flatMap((code) =>
    [...code.matchAll(TUPLE)].map((match) => match[1]!),
  );
}

function wrappingParagraphs(): Array<readonly [string, string[]]> {
  const found: Array<readonly [string, string[]]> = [];
  for (const [path, markdown] of README_SOURCES) {
    for (const block of markdown.replace(/\r\n/g, '\n').split('\n\n')) {
      if (block.startsWith('Subclass the root and re-provide')) {
        found.push([entryPointOf(path), sorted(new Set(spans(block, TOKEN_SPAN)))] as const);
      }
    }
  }
  return found;
}

const CLASSES = decoratedClasses();
const PROVIDING = [...CLASSES.values()].filter((entry) => entry.tokens.length > 0 || entry.helper);

describe('wrapping guide rosters', () => {
  it('reads both wrapping guides', () => {
    expect(sorted(GUIDE_SOURCES.keys())).toEqual(
      expect.arrayContaining([FORM_GUIDE, NON_FORM_GUIDE]),
    );
  });

  it('extracts a providers array from every decorator that declares one', () => {
    expect(PROVIDING.length).toBeGreaterThan(70);
    expect(PROVIDING.length).toBe(providersLineCount());
  });

  it('names exactly the tokens each claimed class provides', () => {
    const mismatched = claims()
      .flatMap((claim) => claim.classes.map((name) => [name, claim] as const))
      .filter(([name, claim]) => {
        const source = CLASSES.get(name);
        return source?.helper || sorted(claim.tokens).join() !== source?.tokens.join();
      })
      .map(
        ([name, claim]) =>
          `${claim.where}: ${name} names ${claim.tokens.join(', ')}, source provides ${
            CLASSES.get(name)?.helper ?? CLASSES.get(name)?.tokens.join(', ') ?? 'nothing'
          }`,
      );

    expect(sorted(mismatched)).toEqual([]);
  });

  it('claims every directive that provides a token', () => {
    const claimed = new Set(claims().flatMap((claim) => claim.classes));
    const unclaimed = PROVIDING.filter(
      (entry) => !entry.component && !entry.helper && !claimed.has(entry.name),
    ).map((entry) => `${entry.name} (${entry.path}): ${entry.tokens.join(', ')}`);

    expect(sorted(unclaimed)).toEqual([]);
  });

  it('pairs every directive that spreads a provider helper with that helper', () => {
    const pairs = helperClaims();
    const wrong = pairs
      .filter(([name, helper]) => CLASSES.get(name)?.helper !== helper)
      .map(([name, helper]) => `${name}: guide names ${helper}`);
    const named = new Set(pairs.map(([name]) => name));
    const missing = PROVIDING.filter(
      (entry) => !entry.component && entry.helper && !named.has(entry.name),
    ).map((entry) => `${entry.name}: ${entry.helper}`);

    expect(sorted([...wrong, ...missing])).toEqual([]);
  });

  it('lists as leaf controls exactly the tuple-wrapped controls with no providers', () => {
    const controls = exportedTuples().map((tuple) => `For${pascal(tuple)}`);
    const bare = controls.filter((name) => {
      const entry = CLASSES.get(name);
      return entry !== undefined && entry.tokens.length === 0 && !entry.helper;
    });

    expect(sorted(leafControls())).toEqual(sorted(bare));
  });

  it('lists every exported host-directive tuple pair in the tuples table', () => {
    const rows = tableRows(guide(FORM_GUIDE), /^\| Primitive\s+\| Inputs tuple\s+\|/);
    const documented = rows.map((cells) => {
      const name = spans(cells[0]!, CLASS_SPAN)[0];
      return `${name} ${spans(cells[1]!, TOKEN_SPAN).join()} ${spans(cells[2]!, TOKEN_SPAN).join()}`;
    });
    const exported = exportedTuples().map(
      (tuple) =>
        `For${pascal(tuple)} FOR_${tuple}_HOST_DIRECTIVE_INPUTS FOR_${tuple}_HOST_DIRECTIVE_OUTPUTS`,
    );

    expect(exported.filter((row) => !CLASSES.has(row.split(' ')[0]!))).toEqual([]);
    expect(sorted(documented)).toEqual(sorted(exported));
  });

  it('names every split root, and only those, as split', () => {
    expect(sorted(splitRootsInGuides())).toEqual(sorted(guardedRoots()));
  });

  it("names a provider set some directive of the README's entry point provides", () => {
    const paragraphs = wrappingParagraphs();
    const wrong = paragraphs
      .filter(
        ([entryPoint, tokens]) =>
          !PROVIDING.some(
            (entry) =>
              entryPointOf(entry.path) === entryPoint && entry.tokens.join() === tokens.join(),
          ),
      )
      .map(([entryPoint, tokens]) => `${entryPoint}/README.md: ${tokens.join(', ')}`);

    expect(paragraphs.length).toBeGreaterThan(20);
    expect(sorted(wrong)).toEqual([]);
  });
});
