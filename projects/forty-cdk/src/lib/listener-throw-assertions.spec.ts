import { SPEC_CODE, stripComments, SUITE_SOURCES } from '../test-utils/source-scan';

const SELF = 'src/lib/listener-throw-assertions.spec.ts';

const DISPATCHERS = new Set(['dispatchEvent', 'pressKey', 'pressWithMouse', 'pointerEvent']);

const SCANNED: ReadonlyArray<readonly [string, string]> = [
  ...SPEC_CODE,
  ...[...SUITE_SOURCES]
    .filter(([path]) => path.endsWith('.spec.ts') && path !== SELF)
    .map(([path, source]) => [path, stripComments(source)] as const),
];

/** The index of the parenthesis closing the one at `open`, or -1 when it never closes. */
function closingParen(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

/** The callee of `expression` when the whole expression is one call, else `null`. */
function wholeCallee(expression: string): string | null {
  const head = /^[\w$.!?]*?([\w$]+)!?\s*\(/.exec(expression);
  if (head === null) return null;
  const open = head[0].length - 1;
  return closingParen(expression, open) === expression.length - 1 ? (head[1] ?? null) : null;
}

/** The single expression an arrow callback evaluates, or `null` when it does more. */
function arrowBody(argument: string): string | null {
  const arrow = /^\(\s*\)\s*=>\s*/.exec(argument);
  if (arrow === null) return null;
  const body = argument.slice(arrow[0].length).trim();
  if (!body.startsWith('{')) return body;
  const inner = /^\{\s*(?:return\s+)?([\s\S]*?);?\s*\}$/.exec(body)?.[1];
  return inner === undefined || inner.includes(';') ? null : inner.trim();
}

/** Every `expect(() => <dispatch>).not.toThrow()` in `code`, as 1-based line numbers. */
function vacuousDispatchAssertions(code: string): number[] {
  const lines: number[] = [];
  for (const match of code.matchAll(/\bexpect\(/g)) {
    const open = match.index + match[0].length - 1;
    const close = closingParen(code, open);
    if (close === -1 || !/^\s*\.not\s*\.toThrow\b/.test(code.slice(close + 1))) continue;
    const body = arrowBody(code.slice(open + 1, close).trim());
    const callee = body === null ? null : wholeCallee(body);
    if (callee !== null && DISPATCHERS.has(callee)) {
      lines.push(code.slice(0, match.index).split('\n').length);
    }
  }
  return lines;
}

const HAND_ROLLED_HANDLER = /\bimplements\s+ErrorHandler\b|\bprovide\s*:\s*ErrorHandler\b/;

/**
 * A listener's throw never reaches the code that dispatched the event: `dispatchEvent` swallows
 * it and Angular hands it to the application `ErrorHandler`. So
 * `expect(() => pressKey(…)).not.toThrow()` cannot fail, and a test whose title rests on it
 * passes whether the listener throws or not. The channel that can fail is
 * `captureHandledErrors()` from `src/test-utils/handled-errors.ts`, and this guard keeps both
 * halves true over every spec in the library: no dispatch is wrapped in `not.toThrow()`, and no
 * spec hand-rolls its own capturing `ErrorHandler` beside the helper.
 */
describe('listener throws are asserted through the ErrorHandler', () => {
  it('scans the whole spec suite', () => {
    expect(SCANNED.length).toBeGreaterThan(300);
  });

  it('reports the vacuous shape in a synthetic source', () => {
    const probe = [
      `it('probe', () => {`,
      `  expect(() => pressKey(el, 'ArrowDown', { shiftKey: true })).not.toThrow();`,
      `  expect(() => {`,
      `    host.dispatchEvent(new Event('x'));`,
      `  }).not.toThrow();`,
      `  expect(() => options.onPointerDownOutside!(pointerEvent())).not.toThrow();`,
      `  expect(() => pressKey(el, 'Enter')).toThrow();`,
      `});`,
    ].join('\n');

    expect(vacuousDispatchAssertions(probe)).toEqual([2, 3]);
  });

  it('wraps no dispatched event in not.toThrow()', () => {
    const found = SCANNED.flatMap(([path, code]) =>
      vacuousDispatchAssertions(code).map((line) => `${path}:${line}`),
    );

    expect(found).toEqual([]);
  });

  it('reports a hand-rolled capturing ErrorHandler in a synthetic source', () => {
    expect(HAND_ROLLED_HANDLER.test('class C implements ErrorHandler {}')).toBe(true);
    expect(HAND_ROLLED_HANDLER.test('{ provide: ErrorHandler, useValue: h }')).toBe(true);
  });

  it('captures handled errors through captureHandledErrors() only', () => {
    const handRolled = SCANNED.filter(([, code]) => HAND_ROLLED_HANDLER.test(code)).map(
      ([path]) => path,
    );

    expect(handRolled).toEqual([]);
  });
});
