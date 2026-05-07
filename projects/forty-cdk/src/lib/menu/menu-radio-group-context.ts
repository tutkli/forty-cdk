import { inject, InjectionToken, ModelSignal } from '@angular/core';

/**
 * Coordination contract owned by `[forMenuRadioGroup]`. Radio items inject
 * it to read selection state and request a value change. Independent from
 * the parent menu's context so radio items can compose without the radio
 * group needing to know about menu internals (and vice versa).
 */
export interface ForMenuRadioGroupContext {
  readonly value: ModelSignal<string>;
  isSelected(value: string): boolean;
  select(value: string): void;
}

export const FOR_MENU_RADIO_GROUP_CONTEXT = new InjectionToken<ForMenuRadioGroupContext>(
  'FOR_MENU_RADIO_GROUP_CONTEXT',
);

export function injectMenuRadioGroupContext(piece: string): ForMenuRadioGroupContext {
  const ctx = inject(FOR_MENU_RADIO_GROUP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/menu] ${piece} must be used inside a [forMenuRadioGroup] element.`);
  }
  return ctx;
}
