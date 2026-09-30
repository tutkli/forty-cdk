import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import { assertRootContext, unresolvedRootError } from 'forty-cdk/core';
import { type ForMenuCloseReason, type MenuActivationModality } from 'forty-cdk/core-overlay';

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

  /**
   * Id mirrored to the trigger's host `[id]`, adopting a consumer-set static
   * `id` when present. It is **not** used as the menu's
   * `aria-labelledby` target — the trigger is the whole right-click region, so
   * naming the menu after it would announce the region's entire text; name the
   * menu with `ariaLabel` instead. The id stays exposed as a stable hook for
   * the consumer's own references and test selectors.
   */
  readonly triggerId: Signal<string>;

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
   * (default `'first'`). Honours `disabled`. `modality` (default
   * `'keyboard'`) records how the open was activated: a `'pointer'` open
   * (right-click / long-press) keeps the programmatic initial focus from
   * reflecting `data-highlighted`, while a `'keyboard'` open (`Shift+F10`,
   * the `ContextMenu` key) highlights the focused item.
   */
  openMenu(initialFocus?: 'first' | 'last', modality?: MenuActivationModality): void;
}

/** What `[forContextMenuTrigger]` reads off the root that no consumer has a call to touch. */
export interface ContextMenuPieceContext {
  /** The mounted `[forMenuContent]` element, or `null` while none is registered. */
  readonly content: Signal<HTMLElement | null>;
  /** Closes the menu with `reason`. */
  closeMenu(reason: ForMenuCloseReason): void;
}

/**
 * The trigger's internal view of the root: everything {@link ForContextMenuContext} publishes plus
 * the content read-back the trigger uses to close an open that mounted nothing. `[forContextMenu]`
 * and `[forMenu]` both satisfy it.
 */
export interface ContextMenuContext extends ForContextMenuContext, ContextMenuPieceContext {}

/**
 * Token under which `[forContextMenu]` exposes the {@link ForContextMenuContext}
 * surface to its `[forContextMenuTrigger]`. Subclassed roots re-provide it with
 * `{ provide: FOR_CONTEXT_MENU_CONTEXT, useExisting: MySubclass }`. The trigger
 * reads the same token at an internal type that also reaches the root's mounted
 * content, so a value that merely satisfies the declared type is rejected in dev
 * mode by the trigger that resolves it.
 */
export const FOR_CONTEXT_MENU_CONTEXT = new InjectionToken<ForContextMenuContext>(
  'FOR_CONTEXT_MENU_CONTEXT',
);

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forContextMenuTrigger]` input carries one, the injected
 * `FOR_CONTEXT_MENU_CONTEXT` otherwise. The orphan error only fires when
 * neither resolves, on first read of the returned signal. Must be called in
 * an injection context.
 */
export function injectContextMenuContext(
  explicitRoot: Signal<ForContextMenuContext | ''>,
): Signal<ContextMenuContext> {
  const injected = inject(FOR_CONTEXT_MENU_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    const resolved = explicit === '' ? injected : explicit;
    if (!resolved) {
      throw unresolvedRootError({
        code: 'FORCDK-CONTEXT-MENU-001',
        trigger: '[forContextMenuTrigger]',
        root: '[forContextMenu]',
        token: 'FOR_CONTEXT_MENU_CONTEXT',
        exportAs: 'forContextMenu',
      });
    }
    const widened = resolved as unknown as ContextMenuContext;
    assertRootContext({
      entryPoint: 'context-menu',
      token: 'FOR_CONTEXT_MENU_CONTEXT',
      root: '[forContextMenu]',
      piece: 'ForContextMenuTrigger',
      probe: () => widened.closeMenu,
    });
    return widened;
  });
}
