import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  injectDropListContext,
  type ForDragEndEvent,
  type ForDragStartEvent,
  type ForDraggableHandle,
} from './drag-drop-context';
import { FOR_DRAG_DROP_DEFAULTS } from './drag-drop-defaults';

/**
 * Marks an element as a draggable item inside a `[forDropList]`. Handles
 * keyboard interaction for lift, move, drop, and cancel.
 *
 * Phase 1 is keyboard-only. Pointer dragging lands in a follow-up.
 */
@Directive({
  selector: '[forDraggable]',
  exportAs: 'forDraggable',
  host: {
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-roledescription]': 'roleDescription() || null',
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.data-dragging]': "lifted() ? '' : null",
    '[attr.data-disabled]': "effectiveDisabled() ? '' : null",
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class ForDraggable {
  readonly #list = injectDropListContext('ForDraggable');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_DRAG_DROP_DEFAULTS);

  /** Data payload handed back in the `dragDrop` event when this item is dropped. */
  readonly dragData = input.required<unknown>();

  /** When true, this item cannot be lifted. The item remains focusable. */
  readonly dragDisabled = input(false, { transform: booleanAttribute });

  /** Emitted when a keyboard drag starts from this item. */
  readonly dragStart = output<ForDragStartEvent>();

  /** Emitted when a keyboard drag originating from this item ends (committed or cancelled). */
  readonly dragEnd = output<ForDragEndEvent>();

  readonly effectiveDisabled = computed(() => this.dragDisabled() || this.#list.disabled());

  /** `true` when this item is the currently lifted draggable. Reflected as `data-dragging`. */
  readonly lifted = computed(() => this.#list.isLifted(this.#host.nativeElement));

  /** `true` when this item is the roving-tabindex active candidate. */
  protected readonly highlighted = computed(() =>
    this.#list.isItemHighlighted(this.#host.nativeElement),
  );

  /** `aria-roledescription` value from defaults. */
  protected readonly roleDescription = computed(() => this.#defaults.itemRoleDescription);

  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    const rovingTabindex = this.#list.itemTabindex(this.#host.nativeElement);
    if (rovingTabindex !== null) {
      return rovingTabindex;
    }
    return this.#list.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle: ForDraggableHandle = {
      host: this.#host.nativeElement,
      data: this.dragData,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.#list.registerItem(h),
      (h) => this.#list.unregisterItem(h),
    );
  }

  protected onFocus(): void {
    if (!this.effectiveDisabled()) {
      this.#list.setActiveItem(this.#host.nativeElement);
    }
  }

  protected onBlur(): void {
    if (this.lifted()) {
      this.#list.cancel();
      this.dragEnd.emit({ dropped: false });
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const host = this.#host.nativeElement;
    if (this.lifted()) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        this.#list.drop();
        this.dragEnd.emit({ dropped: true });
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.#list.cancel();
        this.dragEnd.emit({ dropped: false });
        return;
      }
      const action = resolveListNavigation(event, {
        orientation: this.#list.orientation(),
        dir: this.#list.dir(),
      });
      if (action) {
        event.preventDefault();
        this.#list.moveLifted(action);
      }
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const index = this.#list.lift(host);
      if (index >= 0) {
        this.dragStart.emit({ source: this.#list, index });
      }
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.#list.orientation(),
      dir: this.#list.dir(),
    });
    if (action) {
      event.preventDefault();
      this.#list.navigate(host, action);
    }
  }
}

