import { readmeApiRows } from '../test-utils/readme-api-rows';
import { entryPointOf, LIBRARY_CODE, README_SOURCES } from '../test-utils/source-scan';

/**
 * Every form control's README API rows agree with the declarations they copy:
 * the inputs and models `FormUiControlBase` declares once for the whole family,
 * and each control's own `value` / `checked` / `indeterminate` model.
 *
 * The family is derived the way `form-control-adopters.spec.ts` derives it, and
 * each member is resolved through the class's `extends` chain, so a base input
 * retyped in one place is checked against every README row that restates it.
 * A row's Type cell must equal `input<T>` / `model<T>` as declared, and its
 * Default cell must equal the initializer whenever the initializer is a
 * literal. A row naming no declared member is out of scope.
 */
interface Declaration {
  readonly signature: string | null;
  readonly initializer: string | null;
}

interface ClassShape {
  readonly base: string | null;
  readonly members: ReadonlyMap<string, Declaration>;
}

const CLASS_HEADER = /\bclass\s+(\w+)(?:\s*<[^{]*?>)?\s*(?:extends\s+(\w+))?/g;

const MEMBER = /\breadonly\s+(\w+)\s*(?::\s*(\w+)\s*<)?/g;

const EXPORTED_CLASS = /(?:^|\n)export\s+(abstract\s+)?class\s+(\w+)(?:<[^>]*>)?([\s\S]*?)\{/g;

const FORM_CONTROL_HERITAGE = /\bimplements\b[\s\S]*\b(?:FormValueControl|FormCheckboxControl)\b/;

const LITERAL = /^(?:true|false|null|\[\]|'[^']*'|"[^"]*"|-?\d+(?:\.\d+)?)$/;

function balanced(source: string, from: number, open: string, close: string): number {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const char = source[i]!;
    if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function firstArgument(source: string, open: number): string {
  let depth = 0;
  for (let i = open + 1; i < source.length; i++) {
    const char = source[i]!;
    if ('([{<'.includes(char)) {
      depth++;
    } else if (')]}>'.includes(char)) {
      if (depth === 0) {
        return source.slice(open + 1, i).trim();
      }
      depth--;
    } else if (char === ',' && depth === 0) {
      return source.slice(open + 1, i).trim();
    }
  }
  return '';
}

function inferredType(initializer: string, options: string): string | null {
  if (/\btransform:\s*booleanAttribute\b/.test(options) || /^(?:true|false)$/.test(initializer)) {
    return 'boolean';
  }
  return /^(?:'[^']*'|"[^"]*")$/.test(initializer) ? 'string' : null;
}

function declarationAt(source: string, match: RegExpExecArray): Declaration | null {
  let cursor = match.index + match[0].length;
  let annotated: string | null = null;
  if (match[2] !== undefined) {
    const close = balanced(source, cursor - 1, '<', '>');
    annotated = source.slice(cursor, close).trim();
    cursor = close + 1;
  }
  const call = /^\s*=\s*(input|model)(\.required)?/.exec(source.slice(cursor));
  if (call === null) {
    return null;
  }
  cursor += call[0].length;
  let explicit: string | null = null;
  if (source[cursor] === '<') {
    const close = balanced(source, cursor, '<', '>');
    explicit = source.slice(cursor + 1, close).trim();
    cursor = close + 1;
  }
  if (source[cursor] !== '(') {
    return null;
  }
  const end = balanced(source, cursor, '(', ')');
  const required = call[2] !== undefined;
  const initializer = required ? null : firstArgument(source, cursor);
  const type =
    explicit ??
    annotated ??
    (initializer ? inferredType(initializer, source.slice(cursor, end)) : null);
  return {
    signature: type === null ? null : `${call[1]}${required ? '.required' : ''}<${type}>`,
    initializer,
  };
}

function classShapes(): ReadonlyMap<string, ClassShape> {
  const shapes = new Map<string, ClassShape>();
  for (const source of LIBRARY_CODE.values()) {
    const headers = [...source.matchAll(CLASS_HEADER)];
    headers.forEach((header, index) => {
      const end = headers[index + 1]?.index ?? source.length;
      const body = source.slice(header.index, end);
      const members = new Map<string, Declaration>();
      for (const match of body.matchAll(MEMBER)) {
        const declaration = declarationAt(body, match);
        if (declaration !== null && !members.has(match[1]!)) {
          members.set(match[1]!, declaration);
        }
      }
      shapes.set(header[1]!, { base: header[2] ?? null, members });
    });
  }
  return shapes;
}

function resolve(
  shapes: ReadonlyMap<string, ClassShape>,
  className: string,
  member: string,
): Declaration | null {
  for (let current = shapes.get(className); current; current = shapes.get(current.base ?? '')) {
    const declaration = current.members.get(member);
    if (declaration) {
      return declaration;
    }
  }
  return null;
}

function formControls(): ReadonlyArray<readonly [entryPoint: string, className: string]> {
  const found: Array<readonly [string, string]> = [];
  for (const [path, source] of LIBRARY_CODE) {
    for (const [, isAbstract, className, heritage] of source.matchAll(EXPORTED_CLASS)) {
      if (isAbstract === undefined && FORM_CONTROL_HERITAGE.test(heritage!)) {
        found.push([entryPointOf(path), className!] as const);
      }
    }
  }
  return found;
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').replace(/"/g, "'").trim();

const OWN_VALUE_MEMBERS = ['value', 'checked', 'indeterminate'];

function audit(): { readonly checked: number; readonly drift: readonly string[] } {
  const shapes = classShapes();
  const derived = new Set([
    ...(shapes.get('FormUiControlBase')?.members.keys() ?? []),
    ...OWN_VALUE_MEMBERS,
  ]);
  const drift: string[] = [];
  let checked = 0;
  for (const [entryPoint, className] of formControls()) {
    const readme = README_SOURCES.get(`${entryPoint}/README.md`) ?? '';
    for (const row of readmeApiRows(readme, className)) {
      for (const member of row.members) {
        const declared = derived.has(member) ? resolve(shapes, className, member) : null;
        if (declared === null) {
          continue;
        }
        const where = `${entryPoint}/README.md:${row.line} ${className}.${member}`;
        if (declared.signature !== null) {
          checked++;
          if (normalize(row.type) !== normalize(declared.signature)) {
            drift.push(`${where}: Type \`${row.type}\`, declared \`${declared.signature}\``);
          }
        }
        if (declared.initializer !== null && LITERAL.test(declared.initializer)) {
          checked++;
          if (normalize(row.defaultValue ?? '') !== normalize(declared.initializer)) {
            drift.push(
              `${where}: Default \`${row.defaultValue}\`, initializer \`${declared.initializer}\``,
            );
          }
        }
      }
    }
  }
  return { checked, drift };
}

describe('form-control README API rows (derived from the declarations)', () => {
  it('derives the form-control family and the base it inherits from', () => {
    expect(formControls().length).toBeGreaterThanOrEqual(20);
    const base = classShapes().get('FormUiControlBase');
    expect([...(base?.members.keys() ?? [])]).toEqual(
      expect.arrayContaining(['readonly', 'required', 'invalid', 'pending', 'errors', 'touched']),
    );
  });

  it('checks enough rows that a parser which stopped matching fails here', () => {
    expect(audit().checked).toBeGreaterThanOrEqual(150);
  });

  it('documents every derived member with its declared type and initializer', () => {
    expect(audit().drift).toEqual([]);
  });
});
