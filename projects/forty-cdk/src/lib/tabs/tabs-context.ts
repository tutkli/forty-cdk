import { inject, InjectionToken, Signal } from '@angular/core';

import type { ListNavigationAction, WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';

export type TabsActivationMode = 'automatic' | 'manual';

export interface ForTabsTriggerHandle {
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

export interface ForTabsContentHandle {
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly value: Signal<string>;
}

/**
 * Coordination contract owned by `ForTabs`. Triggers and contents register
 * with the root so each side can look up its pair (for `aria-controls` and
 * `aria-labelledby` wiring), and the root drives keyboard navigation.
 */
export interface ForTabsContext {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly activationMode: Signal<TabsActivationMode>;
  readonly roving: RovingTabindex;

  isSelected(value: string): boolean;
  /** Selects `value` if the tabs widget is interactive. */
  select(value: string): void;
  /** Moves focus from `currentTrigger`. In automatic mode also selects the new tab. */
  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void;

  registerTrigger(handle: ForTabsTriggerHandle): void;
  unregisterTrigger(handle: ForTabsTriggerHandle): void;
  registerContent(handle: ForTabsContentHandle): void;
  unregisterContent(handle: ForTabsContentHandle): void;

  /** Looks up the trigger id for a given tab value. Reactive. */
  triggerIdFor(value: string): string | null;
  /** Looks up the content id for a given tab value. Reactive. */
  contentIdFor(value: string): string | null;
  /** True when `el` is the first enabled trigger in registration order. */
  isFirstEnabledTrigger(el: HTMLElement): boolean;
}

export const FOR_TABS_CONTEXT = new InjectionToken<ForTabsContext>('FOR_TABS_CONTEXT');

export function injectTabsContext(piece: string): ForTabsContext {
  const ctx = inject(FOR_TABS_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/tabs] ${piece} must be used inside a [forTabs] element.`,
    );
  }
  return ctx;
}
