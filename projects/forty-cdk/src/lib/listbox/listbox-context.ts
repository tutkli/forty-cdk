import { inject, InjectionToken, Signal } from '@angular/core';

import type { ListNavigationAction, WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';

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
   * Multi-mode only. Move focus to the next/prev enabled option AND toggle its
   * selected state — APG "Shift+ArrowDown / Shift+ArrowUp toggles selection
   * while moving focus". No-op in single mode, on disabled / readonly, or when
   * no enabled neighbor exists.
   */
  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void;
  /**
   * Multi-mode only. APG "Shift+Space": select every enabled option from the
   * anchor (set on the most recent unmodified activation) up to and including
   * `currentOption`. Existing selection outside the range is preserved. No-op
   * in single mode or when the listbox is disabled / readonly.
   */
  selectRangeToFocused(currentOption: HTMLElement): void;
  /**
   * Multi-mode only. APG "Ctrl/Cmd+A": select every enabled option. If every
   * enabled option is already selected, clears the selection (toggle).
   */
  selectAll(): void;
  /**
   * Multi-mode only. APG "Ctrl+Shift+Home / Ctrl+Shift+End": select every
   * enabled option from `currentOption` (inclusive) to the first / last
   * enabled option, and move focus to that edge.
   */
  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void;
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
