import { inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';

import type { CollectionHandle } from '../_internal/collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * Per-trigger handle stored in the menu's `Collection`. Triggers register
 * themselves on construction so the menu can run roving-tabindex and
 * arrow-key navigation in DOM order.
 */
export interface ForNavigationMenuTriggerHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly id: Signal<string>;
}

/** Per-content handle stored in the menu's `Collection` for trigger ↔ content wiring. */
export interface ForNavigationMenuContentHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly id: Signal<string>;
}

/**
 * Per-viewport handle. Only one viewport is expected per menu (Radix
 * mirror). The host element is the destination for re-parented active
 * content panels, and the viewport owns their ordering.
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
  readonly value: ModelSignal<string>;
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
  scheduleClose(reason: NavigationMenuScheduleReason): void;
  cancelPending(): void;

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void;
  /** Focus the trigger associated with the given value, if any. */
  focusTrigger(value: string): void;

  registerTrigger(handle: ForNavigationMenuTriggerHandle): void;
  unregisterTrigger(handle: ForNavigationMenuTriggerHandle): void;
  registerContent(handle: ForNavigationMenuContentHandle): void;
  unregisterContent(handle: ForNavigationMenuContentHandle): void;
  registerViewport(handle: ForNavigationMenuViewportHandle): void;
  unregisterViewport(handle: ForNavigationMenuViewportHandle): void;

  contentIdFor(value: string): string | null;
  triggerIdFor(value: string): string | null;
  triggerHostFor(value: string): HTMLElement | null;
  /** Layout-oriented selector for indicator positioning. */
  readonly activeTriggerHost: Signal<HTMLElement | null>;
  /** Host element of the currently-active content, if any. */
  readonly activeContentHost: Signal<HTMLElement | null>;
  /** Currently-registered viewport (at most one), or `null`. */
  readonly viewport: Signal<ForNavigationMenuViewportHandle | null>;
  /** Most recent open value before the current one. `''` if none. */
  readonly previousValue: Signal<string>;
  /**
   * Motion direction for `[forNavigationMenuContent]` whose item carries
   * `value`. Returns `null` when no transition applies (first open, value
   * not currently entering or leaving, indices unknown).
   */
  motionFor(value: string): ForNavigationMenuMotion | null;
}

export type NavigationMenuScheduleReason = 'hover' | 'keyboard' | 'click';

/** Per-item context, consumed by the trigger and content. */
export interface ForNavigationMenuItemContext {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

export const FOR_NAVIGATION_MENU_CONTEXT = new InjectionToken<ForNavigationMenuContext>(
  'FOR_NAVIGATION_MENU_CONTEXT',
);

export const FOR_NAVIGATION_MENU_ITEM_CONTEXT = new InjectionToken<ForNavigationMenuItemContext>(
  'FOR_NAVIGATION_MENU_ITEM_CONTEXT',
);

export function injectNavigationMenuContext(piece: string): ForNavigationMenuContext {
  const ctx = inject(FOR_NAVIGATION_MENU_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/navigation-menu] ${piece} must be used inside a [forNavigationMenu] element.`,
    );
  }
  return ctx;
}

export function injectNavigationMenuItemContext(piece: string): ForNavigationMenuItemContext {
  const ctx = inject(FOR_NAVIGATION_MENU_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/navigation-menu] ${piece} must be used inside a [forNavigationMenuItem] element.`,
    );
  }
  return ctx;
}
