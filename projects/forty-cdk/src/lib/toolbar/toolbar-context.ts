import { InjectionToken, type Signal } from '@angular/core';

import type { CollectionHandle } from '../_internal/collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * Per-item handle stored in the toolbar's `Collection`. Buttons, links, and
 * toggle-group items (when nested) register themselves on construction so the
 * toolbar can run roving-tabindex and arrow-key navigation in DOM order.
 */
export interface ForToolbarItemHandle extends CollectionHandle {
  readonly disabled: Signal<boolean>;
}

/** Coordination contract owned by `ForToolbar`. */
export interface ForToolbarContext {
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;
  readonly disabled: Signal<boolean>;

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;
  isFirstFocusableItem(el: HTMLElement): boolean;

  registerItem(handle: ForToolbarItemHandle): void;
  unregisterItem(handle: ForToolbarItemHandle): void;
}

export const FOR_TOOLBAR_CONTEXT = new InjectionToken<ForToolbarContext>('FOR_TOOLBAR_CONTEXT');
