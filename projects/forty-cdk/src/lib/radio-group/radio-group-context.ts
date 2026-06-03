import { inject, InjectionToken, type Signal } from '@angular/core';

import type { ListNavigationAction, WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * Lightweight handle each `ForRadio` registers with the group on init so the
 * group can react to changes in any radio's `disabled` (the `firstEnabledHost`
 * computation depends on every registered handle's disabled signal).
 */
export interface ForRadioHandle {
  readonly host: HTMLElement;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForRadioGroup`. Each `ForRadio` reads its
 * checked / disabled / tabindex state from this and routes click + keyboard
 * activation through `select` / `navigate`.
 */
export interface ForRadioGroupContext {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;

  /** True when some registered radio's value matches the group's current value. */
  readonly hasSelectedRadio: Signal<boolean>;

  isSelected(value: string): boolean;
  /** Selects `value` if the group is interactive. */
  select(value: string): void;
  /** Moves focus + selection from `currentRadio` according to `action`. */
  navigate(currentRadio: HTMLElement, action: ListNavigationAction): void;
  /** True when `el` is the first enabled radio in registration order. */
  isFirstEnabledRadio(el: HTMLElement): boolean;
  registerRadio(handle: ForRadioHandle): void;
  unregisterRadio(handle: ForRadioHandle): void;
}

export const FOR_RADIO_GROUP_CONTEXT = new InjectionToken<ForRadioGroupContext>(
  'FOR_RADIO_GROUP_CONTEXT',
);

export function injectRadioGroupContext(piece: string): ForRadioGroupContext {
  const ctx = inject(FOR_RADIO_GROUP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/radio-group] ${piece} must be used inside a [forRadioGroup] element.`,
    );
  }
  return ctx;
}
