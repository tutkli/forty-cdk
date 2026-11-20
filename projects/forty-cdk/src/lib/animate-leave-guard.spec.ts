import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Library templates that bind `[animate.leave]`, and the `@if` condition each binding must sit
 * directly under. Angular tracks every node removed under a leave binding and releases it only
 * from the class-animation and function-form paths, so a binding that evaluates to an empty class
 * list retains the removed node and its declaration view for as long as the template lives. A
 * guard is a condition that holds only for a node mounted with a non-empty class.
 */
const GUARDED_LEAVE_BINDINGS: Readonly<Record<string, string>> = {
  'toast/src/toast-viewport.ts': 'rowLeaves().get(toast.id)',
};

const LEAVE_BINDING = /\[animate\.leave\]\s*=/g;

/** A control-flow block open at some point of a template: an `@if` with its condition, or any other block. */
type OpenBlock = { kind: 'if'; condition: string } | { kind: 'other' };

/** The index of the parenthesis closing the one opened at `open`. */
function closingParen(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') {
      depth++;
    } else if (code[i] === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * The innermost block enclosing `index`, read from the start of the template literal holding it.
 * Every `{` opens a block and every `}` closes one, so interpolations and object literals in
 * bindings balance themselves out.
 */
function innermostBlock(code: string, index: number): OpenBlock | null {
  const start = code.lastIndexOf('template: `', index);
  const stack: OpenBlock[] = [];
  let pending: OpenBlock | null = null;
  for (let i = start; i < index; i++) {
    if (code.startsWith('@if', i)) {
      const open = code.indexOf('(', i);
      const close = closingParen(code, open);
      pending = { kind: 'if', condition: code.slice(open + 1, close).trim() };
      i = close;
    } else if (code[i] === '{') {
      stack.push(pending ?? { kind: 'other' });
      pending = null;
    } else if (code[i] === '}') {
      stack.pop();
    }
  }
  return stack.at(-1) ?? null;
}

/** Every `[animate.leave]` binding in library source, with the block directly enclosing it. */
function leaveBindings(): readonly { path: string; block: OpenBlock | null }[] {
  return [...LIBRARY_CODE].flatMap(([path, code]) =>
    [...code.matchAll(LEAVE_BINDING)].map((match) => ({
      path,
      block: innermostBlock(code, match.index),
    })),
  );
}

describe('[animate.leave] bindings in library templates', () => {
  it('finds the bindings it guards', () => {
    expect(leaveBindings().length).toBeGreaterThan(0);
  });

  it('binds [animate.leave] only directly under an @if guaranteeing a non-empty class', () => {
    const unguarded = leaveBindings()
      .filter(({ path, block }) => {
        const guard = GUARDED_LEAVE_BINDINGS[path];
        return guard === undefined || block?.kind !== 'if' || block.condition !== guard;
      })
      .map(({ path, block }) =>
        block?.kind === 'if' ? `${path} under @if (${block.condition})` : `${path} unguarded`,
      );

    expect(unguarded).toEqual([]);
  });

  it('lists no file that no longer binds [animate.leave]', () => {
    const binding = new Set(leaveBindings().map(({ path }) => path));

    expect(Object.keys(GUARDED_LEAVE_BINDINGS).filter((path) => !binding.has(path))).toEqual([]);
  });
});
