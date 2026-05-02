import { inject, InjectionToken, ModelSignal, Signal } from '@angular/core';
import type { Placement, ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * Why a select requested close. Mirrors the menu primitive vocabulary so
 * downstream code that switches on close reasons stays consistent.
 */
export type ForSelectCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Where focus lands when the listbox opens. `'selected'` snaps to the first
 * currently-selected enabled option (matches native `<select>`); falls back
 * to `'first'` if no selection is enabled.
 */
export type ForSelectInitialFocus = 'first' | 'last' | 'selected';

/**
 * Handle every `[forSelectOption]` registers with the root. The collection
 * orders entries by DOM document order so groups, separators, and `@for`
 * loops don't perturb keyboard navigation.
 */
export interface ForSelectOptionHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `[forSelect]`. Trigger, content, value,
 * options, groups and separators all inject this token to read state and
 * delegate behavior — they don't import the root class directly.
 */
export interface ForSelectContext {
  readonly value: ModelSignal<readonly string[]>;
  readonly open: ModelSignal<boolean>;
  readonly multiple: Signal<boolean>;

  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;

  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly placement: Signal<Placement>;
  readonly offset: Signal<number>;
  readonly loop: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly selectionFollowsFocus: Signal<boolean>;
  readonly placeholder: Signal<string>;

  /** Where focus should land after the content mounts. Triggers set this before flipping `open`. */
  readonly initialFocus: Signal<ForSelectInitialFocus>;
  setInitialFocus(target: ForSelectInitialFocus): void;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

  /** The button trigger — passed to floating-ui as anchor and exempt from outside-pointer checks. */
  readonly anchor: Signal<ReferenceElement | null>;
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /** The mounted `[forSelectContent]` element. */
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  registerOption(handle: ForSelectOptionHandle): void;
  unregisterOption(handle: ForSelectOptionHandle): void;

  /** All registered options in DOM order. */
  readonly options: Signal<readonly ForSelectOptionHandle[]>;
  /** Trimmed `textContent` of the options whose value is in `value()`, in selection order. */
  readonly selectedLabels: Signal<readonly string[]>;

  isSelected(value: string): boolean;
  /** Toggle in multi-mode, replace + close in single-mode. No-op on disabled / readonly. */
  activate(value: string): void;
  /** Move focus inside the open listbox in response to an arrow / Home / End key. */
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  /** Open-state typeahead: focus the first enabled option whose text matches the buffered prefix. */
  handleTypeahead(event: KeyboardEvent): void;
  /**
   * Closed-state typeahead (single mode only). Selects the first matching
   * option directly without opening the listbox — mirrors native `<select>`
   * behavior. Returns `true` if the key was consumed by typeahead.
   */
  handleClosedTypeahead(event: KeyboardEvent): boolean;

  focusFirstEnabledOption(): boolean;
  focusLastEnabledOption(): boolean;
  /** Focus the first enabled option whose value is currently selected. Returns `false` if none. */
  focusSelectedOption(): boolean;

  toggle(initialFocus?: ForSelectInitialFocus): void;
  openMenu(initialFocus?: ForSelectInitialFocus): void;
  closeMenu(reason: ForSelectCloseReason): void;

  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(event: PointerEvent): void;
  emitFocusOutside(event: FocusEvent): void;
  emitInteractOutside(event: PointerEvent | FocusEvent): void;

  /** Flip the `touched` model. Called by trigger on blur-to-outside and on dismiss events. */
  markTouched(): void;
}

export const FOR_SELECT_CONTEXT = new InjectionToken<ForSelectContext>('FOR_SELECT_CONTEXT');

export function injectSelectContext(piece: string): ForSelectContext {
  const ctx = inject(FOR_SELECT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/select] ${piece} must be used inside a [forSelect] element.`,
    );
  }
  return ctx;
}
