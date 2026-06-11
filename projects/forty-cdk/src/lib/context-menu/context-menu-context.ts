import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * Coordination contract `[forContextMenuTrigger]` resolves from its enclosing
 * `[forContextMenu]` root. It exposes exactly the slice of the root the
 * trigger consumes: open / disabled state, trigger registration (for
 * return-focus on close), the pointer / keyboard virtual-anchor setters, and
 * the open entry point.
 *
 * `ForContextMenu` provides it via `useExisting`, so a subclassed root (the
 * standard design-system wrapping pattern) only has to re-provide tokens —
 * `FOR_MENU_CONTEXT` for items / content and `FOR_CONTEXT_MENU_CONTEXT` for
 * the trigger — never a concrete-class alias.
 */
export interface ForContextMenuContext {
  /**
   * Whether the menu is currently shown. Read-only at the contract level —
   * the root backs it with its own `model<boolean>` and writes through its
   * `openMenu` / `closeMenu` plumbing; the trigger only ever reads.
   */
  readonly open: Signal<boolean>;

  /**
   * When `true`, trigger activations are no-ops and the `contextmenu` event
   * falls through to the native browser menu.
   */
  readonly disabled: Signal<boolean>;

  /** Registers the trigger element so it receives return-focus on close. */
  registerTrigger(el: HTMLElement): void;

  /** Unregisters a previously registered trigger element. */
  unregisterTrigger(el: HTMLElement): void;

  /** Updates the virtual anchor to a 0×0 rect at (`x`, `y`) in viewport coordinates. */
  setVirtualAnchor(x: number, y: number): void;

  /**
   * Updates the virtual anchor to a by-value snapshot of `rect`. Used by the
   * keyboard activators (`Shift+F10`, the `ContextMenu` key) so the menu
   * floats off the focused element instead of the pointer position.
   */
  setVirtualAnchorFromRect(rect: DOMRect): void;

  /**
   * Opens the menu and sends focus to its first or last enabled item
   * (default `'first'`). Honours `disabled`.
   */
  openMenu(initialFocus?: 'first' | 'last'): void;
}

/**
 * Token under which `[forContextMenu]` exposes the {@link ForContextMenuContext}
 * surface to its `[forContextMenuTrigger]`. Subclassed roots re-provide it with
 * `{ provide: FOR_CONTEXT_MENU_CONTEXT, useExisting: MySubclass }`.
 */
export const FOR_CONTEXT_MENU_CONTEXT = new InjectionToken<ForContextMenuContext>(
  'FOR_CONTEXT_MENU_CONTEXT',
);

export function injectContextMenuContext(): ForContextMenuContext {
  const ctx = inject(FOR_CONTEXT_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      '[forty-cdk/context-menu] ForContextMenuTrigger must be used inside a [forContextMenu] element.',
    );
  }
  return ctx;
}
