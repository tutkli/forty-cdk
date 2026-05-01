import { inject, InjectionToken, Signal } from '@angular/core';

import type { ListNavigationAction, WritingDirection } from '../_internal/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex';

export interface ForListboxOptionHandle {
  readonly host: HTMLElement;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForListbox`. Each `ForListboxOption`
 * registers a handle on init so the group can react to disabled changes,
 * compute the first-enabled tab entry, and run typeahead matching.
 */
export interface ForListboxContext {
  readonly value: Signal<readonly string[]>;
  readonly multiple: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly selectionFollowsFocus: Signal<boolean>;
  readonly roving: RovingTabindex;

  isSelected(value: string): boolean;
  /** Toggle in multi-mode, replace in single-mode. No-op on disabled / readonly. */
  activate(value: string): void;
  /** Move focus from `currentOption` according to `action`. May also select if `selectionFollowsFocus` is on. */
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  /**
   * Forward a keydown to the typeahead helper. If the key is a printable
   * character, finds the first matching option and focuses it; returns true
   * to indicate the event was consumed.
   */
  handleTypeahead(event: KeyboardEvent): boolean;
  isFirstEnabledOption(el: HTMLElement): boolean;

  registerOption(handle: ForListboxOptionHandle): void;
  unregisterOption(handle: ForListboxOptionHandle): void;
}

export const FOR_LISTBOX_CONTEXT = new InjectionToken<ForListboxContext>(
  'FOR_LISTBOX_CONTEXT',
);

export function injectListboxContext(piece: string): ForListboxContext {
  const ctx = inject(FOR_LISTBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/listbox] ${piece} must be used inside a [forListbox] element.`,
    );
  }
  return ctx;
}
