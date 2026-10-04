import { LIBRARY_CODE } from '../test-utils/source-scan';

const HELPER = 'focusWhenMounted';
const MEDIATOR = 'createKeyboardDragMediator';

function declaringPath(symbol: string): string {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes(`export function ${symbol}(`),
  );
  expect(found).toBeDefined();
  return found![0];
}

function calls(source: string, symbol: string): boolean {
  return new RegExp(`[^A-Za-z#.]${symbol}\\(`).test(source);
}

function keyboardDropOwners(): string[] {
  const mediator = declaringPath(MEDIATOR);
  return [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        (path !== mediator && calls(source, MEDIATOR)) ||
        /class \w+ implements ForDropListContext\b/.test(source),
    )
    .map(([path]) => path)
    .sort();
}

describe('keyboard drop focus adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds the shared helper in the internal core tier', () => {
    expect(declaringPath(HELPER)).toMatch(/^core\/src\//);
  });

  it('derives every owner of a keyboard drop: the drop list and each coordinator', () => {
    const owners = keyboardDropOwners();
    expect(owners).toContain('drag-drop/src/drop-list.ts');
    expect(owners.length).toBeGreaterThanOrEqual(5);
  });

  it('has every owner move focus after a drop through the shared helper', () => {
    const missing = keyboardDropOwners().filter((path) => !calls(LIBRARY_CODE.get(path)!, HELPER));
    expect(missing).toEqual([]);
  });

  it('has no owner registering a render hook of its own beside the helper', () => {
    const own = keyboardDropOwners().filter((path) =>
      /\bafter(Next|Every)Render\(/.test(LIBRARY_CODE.get(path)!),
    );
    expect(own).toEqual([]);
  });

  it('has every owner cancel a pending focus step when a new gesture starts', () => {
    const missing = keyboardDropOwners().filter(
      (path) => !/Focus\??\.cancel\(\)/.test(LIBRARY_CODE.get(path)!),
    );
    expect(missing).toEqual([]);
  });
});
