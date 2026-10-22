import type { DocDocument } from '../../../../../scripts/docs/doc-model.mjs';
import { compile, FRONTMATTER } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * Every trigger-anchored root inherits the same positioning inputs from
 * `AnchoredOverlayPositioningBase`, and each root's README API table names all
 * of them ([#2308](https://github.com/tutkli/forty-cdk/issues/2308)).
 *
 * Both halves are derived rather than declared. The input names are read from
 * the base's own source, so an input added to the block is owed a row on every
 * page the day it lands. The roots are read from the adopter registry in
 * `src/lib/anchored-positioning-adopters.spec.ts`, which the library suite
 * already holds to "every class extending one of the two bases", so a new
 * anchored root is owed a table without anyone remembering this file.
 *
 * A root's table is the API table under the `###` heading whose first code span
 * is the root's class name, in the README of the entry point declaring it. A
 * grouped row (`side` / `align` / …) names every input it lists.
 */
const BASE_PATH =
  '/projects/forty-cdk/core-anchored/src/floating/anchored-overlay-positioning-base.ts';
const REGISTRY_PATH = '/projects/forty-cdk/src/lib/anchored-positioning-adopters.spec.ts';

const SOURCES = {
  ...import.meta.glob(
    '/projects/forty-cdk/core-anchored/src/floating/anchored-overlay-positioning-base.ts',
    { query: '?raw', import: 'default', eager: true },
  ),
  ...import.meta.glob('/projects/forty-cdk/src/lib/anchored-positioning-adopters.spec.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

function source(path: string): string {
  const text = SOURCES[path];
  if (text === undefined) {
    throw new Error(`${path.slice(1)} was not found`);
  }
  return text;
}

const INPUT_CALL = /= input\b/g;
const INPUT_DECLARATION = /^ {2}readonly (\w+) = input\b/gm;
const ALIAS = /alias: '(\w+)'/;

/** The public name of every input the base declares, in declaration order. */
function positioningInputs(text: string): readonly string[] {
  const declarations = [...text.matchAll(INPUT_DECLARATION)];
  return declarations.map((declaration, index) => {
    const end = declarations[index + 1]?.index ?? text.length;
    const call = text.slice(declaration.index, end);
    return ALIAS.exec(call)?.[1] ?? declaration[1]!;
  });
}

const REGISTRY_BLOCK = /const REGISTRY: readonly AnchoredRootEntry\[\] = \[([\s\S]*?)\n\];/;
const REGISTRY_ROOT = /root: '\[(\w+)\]'/g;
const REGISTRY_ENTRY = /root: '\[(\w+)\]',\s*source: '([\w-]+)\//g;

interface AnchoredRoot {
  readonly selector: string;
  readonly className: string;
  readonly slug: string;
}

function registryBlock(text: string): string {
  const found = REGISTRY_BLOCK.exec(text);
  if (found === null) {
    throw new Error(`${REGISTRY_PATH.slice(1)} no longer declares the REGISTRY array`);
  }
  return found[1]!;
}

function anchoredRoots(text: string): readonly AnchoredRoot[] {
  return [...registryBlock(text).matchAll(REGISTRY_ENTRY)].map(([, selector, slug]) => ({
    selector: `[${selector!}]`,
    className: `F${selector!.slice(1)}`,
    slug: slug!,
  }));
}

/**
 * Roots whose README documents them in another root's table, because the two
 * share one class hierarchy and the README writes one table for both. Each is
 * held to having no table of its own, so the entry goes once one is written.
 */
const DOCUMENTED_BY: Readonly<Record<string, { readonly table: string; readonly reason: string }>> =
  {
    ForDateRangePicker: {
      table: 'ForDatePicker',
      reason: 'shares DatePickerBase, and the README documents both roots in one table',
    },
    ForMenuSub: {
      table: 'ForMenu',
      reason: 'shares MenuOverlayHost with ForMenu, and the Submenu section points at its table',
    },
  };

const HEADING = /^###\s+(.+)$/gm;
const CODE_SPAN = /`([^`]+)`/g;

/** The names an API table's property column documents, grouped rows included. */
function tableNames(document: DocDocument, className: string): ReadonlySet<string> | null {
  const api = document.sections.find((section) => section.title === 'API');
  if (api === undefined) {
    return null;
  }
  let heading: string | null = null;
  let names: Set<string> | null = null;
  for (const block of api.blocks) {
    if (block.kind === 'prose') {
      const headings = [...block.markdown.matchAll(HEADING)];
      const last = headings.at(-1);
      if (last !== undefined) {
        heading = /`([^`]+)`/.exec(last[1]!)?.[1] ?? null;
      }
      continue;
    }
    if (heading !== className || block.table.role !== 'api') {
      continue;
    }
    names ??= new Set();
    for (const row of block.table.rows) {
      for (const [, name] of row.property.matchAll(CODE_SPAN)) {
        names.add(name!);
      }
    }
  }
  return names;
}

function problemsFor(
  document: DocDocument,
  className: string,
  inputs: readonly string[],
): readonly string[] {
  const names = tableNames(document, className);
  if (names === null) {
    return [`${document.path} has no API table under a \`${className}\` heading in ## API`];
  }
  const missing = inputs.filter((input) => !names.has(input));
  return missing.length === 0
    ? []
    : [`${document.path}: the \`${className}\` API table does not name ${missing.join(', ')}`];
}

function readme(...body: readonly string[]): DocDocument {
  return compile({
    path: 'projects/forty-cdk/thing/README.md',
    slug: 'thing',
    markdown: `${[...FRONTMATTER, '', '# Thing', '', 'Lede.', '', '## API', '', ...body].join('\n')}\n`,
  });
}

const INPUTS = positioningInputs(source(BASE_PATH));
const ROOTS = anchoredRoots(source(REGISTRY_PATH));

describe('the positioning inputs an anchored root inherits', () => {
  it('are read from every input the base declares', () => {
    const calls = source(BASE_PATH).match(INPUT_CALL) ?? [];

    expect(INPUTS.length).toBeGreaterThan(0);
    expect(INPUTS).toHaveLength(calls.length);
    expect(INPUTS).toContain('side');
    expect(INPUTS).toContain('clipUntilPositioned');
  });

  it('are read by their public alias, never the backing field', () => {
    expect(INPUTS.filter((input) => input.startsWith('_'))).toEqual([]);
  });

  it('come with a root for every entry the adopter registry declares', () => {
    const declared = registryBlock(source(REGISTRY_PATH)).match(REGISTRY_ROOT) ?? [];

    expect(ROOTS.length).toBeGreaterThan(0);
    expect(ROOTS).toHaveLength(declared.length);
  });
});

describe('a root API table checked for the inherited positioning inputs', () => {
  const inputs = ['side', 'sticky'];
  const table = (...rows: readonly string[]) => [
    '| Property | Type | Description |',
    '| --- | --- | --- |',
    ...rows,
  ];

  it('fails when the table omits one', () => {
    const document = readme('### `ForThing`', '', ...table('| `side` | `input` | Side. |'));

    expect(problemsFor(document, 'ForThing', inputs)).toEqual([
      'projects/forty-cdk/thing/README.md: the `ForThing` API table does not name sticky',
    ]);
  });

  it('passes when a grouped row names them together', () => {
    const document = readme(
      '### `ForThing`',
      '',
      ...table('| `side` / `sticky` | `input` | Both. |'),
    );

    expect(problemsFor(document, 'ForThing', inputs)).toEqual([]);
  });

  it('does not count a row written under another piece heading', () => {
    const document = readme(
      '### `ForThing`',
      '',
      ...table('| `side` | `input` | Side. |'),
      '',
      '### `ForThingTrigger`',
      '',
      ...table('| `sticky` | `input` | Sticky. |'),
    );

    expect(problemsFor(document, 'ForThing', inputs)).toEqual([
      'projects/forty-cdk/thing/README.md: the `ForThing` API table does not name sticky',
    ]);
  });

  it('fails when the root has no table under ## API', () => {
    const document = readme('Input tables are not yet tabulated.');

    expect(problemsFor(document, 'ForThing', inputs)).toEqual([
      'projects/forty-cdk/thing/README.md has no API table under a `ForThing` heading in ## API',
    ]);
  });
});

describe('every anchored root README', () => {
  it.each(ROOTS.map((root) => [root.selector, root] as const))(
    '%s names every inherited positioning input in its API table',
    (_selector, root) => {
      const doc = PRIMITIVE_DOCS.find((candidate) => candidate.slug === root.slug);
      if (doc === undefined) {
        throw new Error(`no README was found for ${root.slug}`);
      }
      const document = compile(doc);
      const shared = DOCUMENTED_BY[root.className];

      if (shared !== undefined) {
        expect(tableNames(document, root.className), shared.reason).toBeNull();
      }
      expect(problemsFor(document, shared?.table ?? root.className, INPUTS)).toEqual([]);
    },
  );

  it('declares a shared table only for a root the registry lists', () => {
    const classes = new Set(ROOTS.map((root) => root.className));

    expect(Object.keys(DOCUMENTED_BY).filter((name) => !classes.has(name))).toEqual([]);
  });
});
