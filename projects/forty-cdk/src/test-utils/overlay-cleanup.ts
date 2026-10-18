import { beforeEach, onTestFinished } from 'vitest';

const PORTALED_OVERLAY =
  ':scope > [role="dialog"], :scope > [role="alertdialog"], :scope > [role="menu"], :scope > [role="listbox"], :scope > [role="tooltip"], :scope > [data-state="open"]';

/**
 * Registers a per-test leak detector for portaled overlay nodes and
 * body-style residue, checked once the `TestBed` has torn the test's
 * fixtures down.
 *
 * Overlay primitives (Dialog, Popover, DropdownMenu, ContextMenu, Menu,
 * Menubar, Combobox, Select, Listbox, HoverCard, Tooltip, etc.) portal their
 * content into `document.body` via `injectPortal`, and their `DestroyRef`
 * hooks remove that content and release any scroll lock when the builder's
 * `TestBed` teardown destroys the fixture. The check runs from
 * `onTestFinished`, which Vitest calls after every `afterEach` hook — the
 * builder's teardown included — so it sees exactly what those destroy hooks
 * left behind.
 *
 * Whatever is left is scrubbed, so the next test starts from a clean
 * document, and a test that otherwise passed fails naming each leaked node
 * and style. A test that already failed is not failed a second time: a throw
 * between `open.set(true)` and the `afterNextRender` that inserts the
 * portaled node can strand it, and the leak is a consequence of that failure
 * rather than of a broken destroy path.
 *
 * Call it once at the top of the affected `describe` (NOT at module top level):
 *
 * ```ts
 * describe('ForPopover', () => {
 *   afterEachOverlayCleanup();
 *   // …
 * });
 * ```
 *
 * The selector list covers the canonical overlay roles plus
 * `[data-state="open"]` to catch any future overlay primitive that
 * forgets to register here. The style check covers the scroll-lock
 * residue `BodyScrollLock` writes: `overflow` and `paddingRight` on
 * `<body>`, `overflow` on `<html>`.
 *
 * Every selector is anchored with `:scope >`, so the check only ever
 * reaches **direct children of `document.body`** — which is precisely
 * where `injectPortal` lands an overlay (`target.appendChild(el)` with
 * `target` defaulting to `document.body`). `[data-state="open"]` also
 * matches non-portaled elements inside a fixture host (an open accordion,
 * disclosure, or tabs panel) and inside a *contained* overlay's consumer
 * container, none of which is a body child.
 */
export function afterEachOverlayCleanup(): void {
  beforeEach(() => {
    onTestFinished(({ task }) => {
      const leaks = scrubOverlayResidue();
      if (leaks.length === 0 || task.result?.state === 'fail') return;
      throw new Error(
        `[forty-cdk/test-utils] afterEachOverlayCleanup: ${leaks.length} overlay leak(s) survived the TestBed teardown.\n\n` +
          `${leaks.map((leak) => `- ${leak}`).join('\n')}\n\n` +
          'Cause: the destroy hooks of the fixture this test mounted left a portaled node in `document.body`, or did not release the scroll lock.\n\n' +
          "Fix: restore the destroy path that removes the node or releases the lock — the portal's `DestroyRef` cleanup, or the primitive's scroll-lock release. A node the test appended to `document.body` itself is removed by the test.",
      );
    });
  });
}

function scrubOverlayResidue(): string[] {
  const { body, documentElement } = document;
  const leaks: string[] = [];

  for (const [label, style] of [
    ['<body> overflow', body.style.overflow],
    ['<body> padding-right', body.style.paddingRight],
    ['<html> overflow', documentElement.style.overflow],
  ] as const) {
    if (style !== '') leaks.push(`${label}: ${style}`);
  }
  body.style.overflow = '';
  body.style.paddingRight = '';
  documentElement.style.overflow = '';

  for (const node of Array.from(body.querySelectorAll(PORTALED_OVERLAY))) {
    leaks.push(openingTag(node));
    node.remove();
  }

  return leaks;
}

function openingTag(node: Element): string {
  const html = node.outerHTML;
  return html.slice(0, html.indexOf('>') + 1);
}
