import { InjectionToken, type Signal } from '@angular/core';

import type { CollectionHandle } from '../collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from './roving-tabindex';

/**
 * Per-item handle stored in a host-roving container's `Collection`. The
 * lifted shape is the intersection of what every embedded-roving item
 * needs to expose to its host: the DOM node (`host`) and a reactive
 * `disabled` signal so the host can skip disabled items during arrow-key
 * navigation. Container-specific extras (e.g. `value` on toggle items)
 * stay on the container's own handle interface.
 */
export interface HostRovingItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by a "host-with-roving" container — a
 * primitive that owns the roving-tabindex policy and arrow-key navigation
 * for the embedded items it visually composes (which may be its own
 * children OR items belonging to a nested primitive that delegates
 * focus management upward).
 *
 * Today the only container that provides this token is
 * [`ForToolbar`](../../toolbar/toolbar.ts), and the only consumer is
 * [`ForToggleGroupItem`](../../toggle/toggle-group-item.ts) when nested
 * inside a toolbar. The contract is lifted to `_internal/` so that any
 * future host (e.g. Splitbar, a Tablist with side-actions, a Menubar
 * variant that composes embedded toggles) can opt in without
 * `toggle/` taking a static import dependency on `toolbar/` or any
 * other sibling primitive.
 *
 * **Inject contract.** Embedded items inject this token with
 * `{ optional: true, skipSelf: true }` — `optional` because not every
 * embedded-roving item lives inside a host-roving container (e.g. a
 * `[forToggleGroupItem]` used standalone has no toolbar), `skipSelf` so
 * a container that itself implements the contract (Toolbar) does not
 * accidentally inject its own provider when composing other items.
 *
 * The lifted shape is the intersection of what `ForToggleGroupItem`
 * actually consumes: the four signals it reads on the host
 * (`orientation`, `dir`, `disabled`), the navigation policy
 * (`navigate`, `isFirstFocusableItem`), and the registration pair
 * (`registerItem` / `unregisterItem`). Container-specific extras stay
 * on the container's own context interface.
 */
export interface HostRovingContext {
  /** Layout direction the host wants its items to navigate along. */
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  /** Reading direction. RTL swaps ArrowLeft / ArrowRight semantics. */
  readonly dir: Signal<WritingDirection>;
  /** When true, every embedded item is disabled regardless of its own state. */
  readonly disabled: Signal<boolean>;

  /**
   * Roving-tabindex tracker owned by the host. Embedded items call
   * `setActive` on `(focus)` and prefer `active()` in their tabindex
   * computed so the host's single tab stop follows the last focused item
   * (APG re-entry), exactly like Tabs / Tree. Before any focus `active()`
   * is `null` and the item falls back to {@link isFirstFocusableItem}.
   */
  readonly roving: RovingTabindex;

  /**
   * Predicate for the per-item `tabindex` host binding. Returns `true`
   * for the single item that should currently carry `tabindex=0`
   * (the host's "entry point"); every other registered item is `-1`.
   * Only consulted before the roving tracker has an active item.
   */
  isFirstFocusableItem(el: HTMLElement): boolean;

  /**
   * Move focus from `currentItem` to the next item in registration order
   * matching `action`, respecting the host's `loop` policy and skipping
   * disabled handles.
   */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;

  registerItem(handle: HostRovingItemHandle): void;
  unregisterItem(handle: HostRovingItemHandle): void;
}

/**
 * Injection token for `HostRovingContext`. Internal to the library — must
 * NOT be re-exported from `public-api.ts`. Containers that implement the
 * contract provide it via `useExisting` alongside their own primitive
 * context token.
 */
export const FOR_HOST_ROVING_CONTEXT = new InjectionToken<HostRovingContext>(
  'FOR_HOST_ROVING_CONTEXT',
);
