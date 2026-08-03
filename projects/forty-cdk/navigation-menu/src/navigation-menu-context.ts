import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type CollectionHandle,
  type ListNavigationAction,
  type WritingDirection,
} from 'forty-cdk/core';

/**
 * Per-trigger handle stored in the menu's `Collection`. Triggers register
 * themselves on construction so the menu can run roving-tabindex and
 * arrow-key navigation in DOM order.
 *
 * Part of the registration protocol, so it is never exported from
 * `public-api.ts` — see {@link NavigationMenuContext}.
 */
export interface ForNavigationMenuTriggerHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the menu focuses the
   * trigger, scrolls it into view, and measures it for indicator positioning.
   */
  readonly host: HTMLElement;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly id: Signal<string>;
}

/**
 * Per-content handle stored in the menu's `Collection` for trigger ↔ content
 * wiring. Part of the registration protocol, so it is never exported from
 * `public-api.ts` — see {@link NavigationMenuContext}.
 */
export interface ForNavigationMenuContentHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the active panel's host is
   * measured for viewport sizing and counted as a dismiss-exempt surface.
   */
  readonly host: HTMLElement;
  readonly value: Signal<string>;
  readonly id: Signal<string>;
}

/**
 * Per-viewport handle. Only one viewport is expected per menu. The host
 * element is the destination for re-parented active
 * content panels, and the viewport owns their ordering.
 *
 * Part of the registration protocol, so it is never exported from
 * `public-api.ts` — see {@link NavigationMenuContext}.
 */
export interface ForNavigationMenuViewportHandle {
  readonly host: HTMLElement;
  /**
   * Re-parent `panel` into the viewport host at the position dictated by
   * its `triggerHost`'s document order, so the panels' DOM order always
   * matches trigger order regardless of mount timing. This makes the
   * entering/leaving overlap during an animated A→B transition
   * deterministic: a panel whose trigger precedes another's is always
   * inserted before it, never appended last just because it mounted later.
   *
   * No-op when the panel is already correctly placed. `triggerHost` may be
   * `null` (trigger not yet registered); the panel is then appended last.
   */
  insertPanel(panel: HTMLElement, triggerHost: HTMLElement | null): void;
}

/**
 * Logical motion direction for `[forNavigationMenuContent]`'s
 * `data-motion` hook, computed from the relative DOM position of the
 * previously- and currently-active triggers. `null` (attribute absent)
 * when no comparison applies — first open, last close, or unknown values.
 */
export type ForNavigationMenuMotion = 'from-start' | 'from-end' | 'to-start' | 'to-end';

export interface ForNavigationMenuContext {
  /**
   * The open item's value, or `null` for none, as a read-only signal. Mutate it
   * through `open` / `close` / `toggle` or the root's `[(value)]` binding — a
   * direct write would skip the scheduled open / close delays.
   */
  readonly value: Signal<string | null>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;
  readonly disabled: Signal<boolean>;

  isOpen(value: string): boolean;
  /** Toggle the open item (open if closed, close if currently open). */
  toggle(value: string): void;
  /** Open the given item (no-op if already open). */
  open(value: string): void;
  /** Close any open item. */
  close(): void;

  /**
   * Schedule open / close with the configured delays. `reason` lets the
   * implementation skip delays for keyboard-driven changes.
   */
  scheduleOpen(value: string, reason: NavigationMenuScheduleReason): void;
  /**
   * Schedule a hover close. Pass the leaving trigger's `value` so a quick
   * hover-then-leave on a still-closed trigger cancels its own pending open;
   * a pending open for a sibling (hover-across) is left to take over.
   */
  scheduleClose(reason: NavigationMenuScheduleReason, value?: string): void;
  cancelPending(): void;

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void;
  /** Focus the trigger associated with the given value, if any. */
  focusTrigger(value: string): void;

  contentIdFor(value: string): string | null;
  triggerIdFor(value: string): string | null;
  triggerHostFor(value: string): HTMLElement | null;
  /** Layout-oriented selector for indicator positioning. */
  readonly activeTriggerHost: Signal<HTMLElement | null>;
  /** Host element of the currently-active content, if any. */
  readonly activeContentHost: Signal<HTMLElement | null>;
  /** Most recent open value before the current one. `null` if none. */
  readonly previousValue: Signal<string | null>;
  /**
   * Motion direction for `[forNavigationMenuContent]` whose item carries
   * `value`. Returns `null` when no transition applies (first open, value
   * not currently entering or leaving, indices unknown).
   */
  motionFor(value: string): ForNavigationMenuMotion | null;
}

export type NavigationMenuScheduleReason = 'hover' | 'keyboard' | 'click';

/**
 * The navigation menu's internal coordination surface: everything
 * {@link ForNavigationMenuContext} publishes plus the piece-registration
 * protocol and the surface-level focus delegation.
 *
 * Never exported from `public-api.ts`. `[forNavigationMenu]` provides it
 * alongside {@link FOR_NAVIGATION_MENU_CONTEXT} on the same object, so a
 * consumer who injects the public token gets the read surface while the pieces
 * get the wiring protocol.
 */
export interface NavigationMenuContext extends ForNavigationMenuContext {
  registerTrigger(handle: ForNavigationMenuTriggerHandle): void;
  unregisterTrigger(handle: ForNavigationMenuTriggerHandle): void;
  registerContent(handle: ForNavigationMenuContentHandle): void;
  unregisterContent(handle: ForNavigationMenuContentHandle): void;
  registerViewport(handle: ForNavigationMenuViewportHandle): void;
  unregisterViewport(handle: ForNavigationMenuViewportHandle): void;
  /** Currently-registered viewport (at most one), or `null`. */
  readonly viewport: Signal<ForNavigationMenuViewportHandle | null>;
  /**
   * Route a `focusout` observed anywhere on the widget's surface to the root,
   * which acts on it only when the leave reports no destination
   * (`relatedTarget === null`) — every other leave is owned by the dismissible
   * layer's `'focus'` channel. `[forNavigationMenuContent]` delegates its own
   * host's `focusout` here so such a leave is visible to the root even when a
   * `[forNavigationMenuViewport]` re-parented the panel outside the `<nav>`.
   */
  handleSurfaceFocusOut(event: FocusEvent): void;
}

/**
 * DI token carrying the internal {@link NavigationMenuContext}. Provided by
 * `[forNavigationMenu]`.
 */
export const NAVIGATION_MENU_CONTEXT = new InjectionToken<NavigationMenuContext>(
  'NAVIGATION_MENU_CONTEXT',
);

/** Per-item context, consumed by the trigger and content. */
export interface ForNavigationMenuItemContext {
  readonly value: Signal<string>;
  /**
   * The item's own `[disabled]`, without the root `[forNavigationMenu]`'s
   * `disabled` folded in. The trigger composes the two into its
   * `effectiveDisabled`.
   */
  readonly disabled: Signal<boolean>;
}

export const FOR_NAVIGATION_MENU_CONTEXT = new InjectionToken<ForNavigationMenuContext>(
  'FOR_NAVIGATION_MENU_CONTEXT',
);

export const FOR_NAVIGATION_MENU_ITEM_CONTEXT = new InjectionToken<ForNavigationMenuItemContext>(
  'FOR_NAVIGATION_MENU_ITEM_CONTEXT',
);

export function injectNavigationMenuContext(piece: string): NavigationMenuContext {
  const ctx = inject(NAVIGATION_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/navigation-menu] ${piece} must be used inside a [forNavigationMenu] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forNavigationMenu] root.',
    );
  }
  return ctx;
}

export function injectNavigationMenuItemContext(piece: string): ForNavigationMenuItemContext {
  const ctx = inject(FOR_NAVIGATION_MENU_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/navigation-menu] ${piece} must be used inside a [forNavigationMenuItem] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forNavigationMenuItem] root.',
    );
  }
  return ctx;
}
