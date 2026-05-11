import { afterEach } from 'vitest';

/**
 * Registers a defensive `afterEach` hook that scrubs portaled overlay nodes
 * and body-style residue from the document between tests.
 *
 * Overlay primitives (Dialog, Popover, DropdownMenu, ContextMenu, Menu,
 * Menubar, Combobox, Select, Listbox, HoverCard, Tooltip, etc.) portal their
 * content into `document.body` via `injectPortal`. Their `DestroyRef` hook
 * removes that content on `TestBed.resetTestingModule()`, which is the happy
 * path. But when a test throws between `open.set(true)` and the
 * `afterNextRender` callback that actually inserts/removes the portaled node,
 * the directive can be left in an inconsistent state and the orphan node may
 * survive into the next test — turning a single failure into cascading
 * order-dependent flakes.
 *
 * This helper is a leak detector / safety net, NOT the cure: each directive's
 * own destroy hook is still expected to clean up on the happy path. Tests
 * should never depend on this `afterEach` running — but when one of them
 * does throw, the next test gets a clean DOM instead of a contaminated one.
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
 * forgets to register here. The body-style reset undoes any
 * scroll-lock residue (`overflow`, `paddingRight`) left by a
 * mid-flight throw before `BodyScrollLock` could restore it.
 */
export function afterEachOverlayCleanup(): void {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body
      .querySelectorAll(
        '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], [data-state="open"]',
      )
      .forEach((n) => n.remove());
  });
}
