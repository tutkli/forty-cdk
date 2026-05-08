import { inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';

import type { CollectionHandle } from '../_internal/collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * Per-item handle stored in the group's `Collection`. The directive
 * registers itself on construction so the group can compute selection,
 * roving tabindex, and arrow-key navigation in DOM order.
 */
export interface ForToggleGroupItemHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForToggleGroup`. Items read selection
 * and navigation policy from here and call back through `toggle` and
 * `navigate` to drive state changes.
 */
export interface ForToggleGroupContext {
  readonly value: ModelSignal<readonly string[]>;
  readonly multiple: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;

  isSelected(value: string): boolean;
  toggle(value: string): void;

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  isFirstFocusableItem(el: HTMLElement): boolean;

  registerItem(handle: ForToggleGroupItemHandle): void;
  unregisterItem(handle: ForToggleGroupItemHandle): void;
}

export const FOR_TOGGLE_GROUP_CONTEXT = new InjectionToken<ForToggleGroupContext>(
  'FOR_TOGGLE_GROUP_CONTEXT',
);

export function injectToggleGroupContext(piece: string): ForToggleGroupContext {
  const ctx = inject(FOR_TOGGLE_GROUP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/toggle-group] ${piece} must be used inside a [forToggleGroup] element.`,
    );
  }
  return ctx;
}
