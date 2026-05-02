import { inject, InjectionToken, ModelSignal, Signal } from '@angular/core';

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

  contentIdFor(value: string): string | null;
  triggerIdFor(value: string): string | null;
  triggerHostFor(value: string): HTMLElement | null;
}

export type NavigationMenuScheduleReason = 'hover' | 'focus' | 'keyboard' | 'click';

/** Per-item context, consumed by the trigger and content. */
export interface ForNavigationMenuItemContext {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

export const FOR_NAVIGATION_MENU_CONTEXT = new InjectionToken<ForNavigationMenuContext>(
  'FOR_NAVIGATION_MENU_CONTEXT',
);

export const FOR_NAVIGATION_MENU_ITEM_CONTEXT =
  new InjectionToken<ForNavigationMenuItemContext>('FOR_NAVIGATION_MENU_ITEM_CONTEXT');

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
