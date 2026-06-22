import { inject, InjectionToken } from '@angular/core';

/**
 * Coordination contract owned by `[forMenuGroup]`. `[forMenuGroupLabel]`
 * registers its generated id so the group wires `aria-labelledby`.
 */
export interface ForMenuGroupContext {
  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
}

export const FOR_MENU_GROUP_CONTEXT = new InjectionToken<ForMenuGroupContext>(
  'FOR_MENU_GROUP_CONTEXT',
);

export function injectMenuGroupContext(piece: string): ForMenuGroupContext {
  const ctx = inject(FOR_MENU_GROUP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/menu] ${piece} must be used inside a [forMenuGroup] element.`);
  }
  return ctx;
}
