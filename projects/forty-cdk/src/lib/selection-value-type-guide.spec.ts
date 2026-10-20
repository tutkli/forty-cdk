import { GUIDE_SOURCES, LIBRARY_CODE } from '../test-utils/source-scan';

interface ArrayRoot {
  readonly name: string;
  readonly signature: string;
  readonly element: string;
  readonly form: string | null;
  readonly accessor: string | null;
}

const GUIDE = 'docs/selection-value-type-contract.md';
const NOT_FORM_PHRASE = 'are not form controls';

const VALUE_MODEL = /readonly value = model<readonly (\w+)\[\]>\(\[\]\)/;
const CLASS_HEADER = /export class (For\w+)(<[^>{]*>)?([^{]*)\{/g;
const FORM_CONTRACT = /\bimplements\b[\s\S]*?\b(FormValueControl<[^>]*>)/;
const ACCESSOR =
  /readonly (selected|selectedItem) = (?:singleSelected\(this\.value\)|computed<\w+ \| null>)/;
const CLASS_SPAN = /`(For[A-Z]\w*)/g;

const sorted = (values: Iterable<string>): string[] => [...values].sort();
const spans = (text: string, pattern: RegExp): string[] =>
  [...text.matchAll(pattern)].map((match) => match[1]!);
const collapsed = (text: string): string => text.replace(/\s+/g, ' ');

function guide(): string {
  const text = GUIDE_SOURCES.get(GUIDE);
  if (text === undefined) {
    throw new Error(`${GUIDE} was not found`);
  }
  return text.replace(/\r\n/g, '\n');
}

function tableRows(header: RegExp): string[][] {
  const lines = guide().split('\n');
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) {
    throw new Error(`${GUIDE} has no table with the header ${header}`);
  }
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) {
      break;
    }
    rows.push(
      line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/\\\|/g, '|')),
    );
  }
  return rows;
}

function arrayRoots(): ArrayRoot[] {
  const roots: ArrayRoot[] = [];
  for (const code of LIBRARY_CODE.values()) {
    const value = VALUE_MODEL.exec(code);
    if (!value) {
      continue;
    }
    const header = [...code.matchAll(CLASS_HEADER)]
      .filter((match) => match.index < value.index)
      .at(-1);
    if (header === undefined) {
      throw new Error(`no class declares the value model ${value[0]}`);
    }
    roots.push({
      name: header[1]!,
      signature: `${header[1]!}${header[2] ?? ''}`,
      element: value[1]!,
      form: FORM_CONTRACT.exec(header[3]!)?.[1] ?? null,
      accessor: ACCESSOR.exec(code)?.[1] ?? null,
    });
  }
  return roots;
}

const ROOTS = arrayRoots();

describe('selection value-type guide roster', () => {
  it('derives the empty-seeded array-model roots from source', () => {
    expect(sorted(ROOTS.map((root) => root.name))).toEqual(
      expect.arrayContaining(['ForAccordion', 'ForListbox', 'ForTree']),
    );
    expect(ROOTS.filter((root) => root.form !== null).length).toBeGreaterThan(2);
    expect(ROOTS.filter((root) => root.form === null).length).toBeGreaterThan(1);
  });

  it("states every root's generic signature, value model and form contract", () => {
    const documented = tableRows(/^\| Root\s+\| `value`\s+\| Form control\s+\|$/).map((cells) =>
      cells.join(' '),
    );
    const derived = ROOTS.map(
      (root) =>
        `\`${root.signature}\` \`model<readonly ${root.element}[]>\` ${
          root.form === null ? 'No' : `\`${root.form}\``
        }`,
    );

    expect(sorted(documented)).toEqual(sorted(derived));
  });

  it('names as non-form roots exactly the roots that implement no form contract', () => {
    const sentence = collapsed(guide())
      .split(/(?<=\.) /)
      .find((candidate) => candidate.includes(NOT_FORM_PHRASE));
    if (sentence === undefined) {
      throw new Error(`${GUIDE} no longer names the roots that ${NOT_FORM_PHRASE}`);
    }

    expect(sorted(spans(sentence, CLASS_SPAN))).toEqual(
      sorted(ROOTS.filter((root) => root.form === null).map((root) => root.name)),
    );
  });

  it('lists every single-mode accessor with the type of the root it reads', () => {
    const documented = tableRows(/^\| Primitive\s+\| Accessor\s+\|$/).flatMap(([roots, accessor]) =>
      spans(roots!, CLASS_SPAN).map((name) => `${name} ${accessor}`),
    );
    const derived = ROOTS.filter((root) => root.accessor !== null).map(
      (root) => `${root.name} \`${root.accessor}: Signal<${root.element} | null>\``,
    );

    expect(sorted(documented)).toEqual(sorted(derived));
  });
});
