import {
  booleanAttribute,
  computed,
  contentChild,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  type EmbeddedViewRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  ViewContainerRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { attachSwipeDismiss, type SwipeDirection } from '../_internal/swipe-dismiss/swipe-dismiss';
import { createTemplatePreview, type DragPreview } from '../_internal/drag-session/drag-preview';
import {
  FOR_DRAGGABLE_CONTEXT,
  injectDropListContext,
  type ForDragEndEvent,
  type ForDragStartEvent,
  type ForDraggableContext,
  type ForDraggableHandle,
} from './drag-drop-context';
import { FOR_DRAG_DROP_DEFAULTS } from './drag-drop-defaults';
import { ForDragPreview } from './drag-preview';
import { ForDragPlaceholder } from './drag-placeholder';

/**
 * Marks an element as a draggable item inside a `[forDropList]`. Handles
 * keyboard and pointer interaction for lift, move, drop, and cancel.
 */
@Directive({
  selector: '[forDraggable]',
  exportAs: 'forDraggable',
  providers: [{ provide: FOR_DRAGGABLE_CONTEXT, useExisting: ForDraggable }],
  host: {
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-roledescription]': 'roleDescription() || null',
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.data-dragging]': "lifted() ? '' : null",
    '[attr.data-disabled]': "effectiveDisabled() ? '' : null",
    '[style.touch-action]': 'touchAction()',
    '[style.display]': "placeholderActive() ? 'none' : null",
    '(dragstart)': 'onNativeDragStart($event)',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class ForDraggable implements ForDraggableContext {
  readonly #list = injectDropListContext('ForDraggable');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_DRAG_DROP_DEFAULTS);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #document = inject(DOCUMENT);
  readonly #vcr = inject(ViewContainerRef);
  protected readonly previewTpl = contentChild(ForDragPreview);
  protected readonly placeholderTpl = contentChild(ForDragPlaceholder);
  #placeholderView: EmbeddedViewRef<unknown> | null = null;

  /** `true` while a pointer-drag placeholder template occupies this item's slot (host hidden). */
  protected readonly placeholderActive = signal(false);

  readonly #handles = new Set<HTMLElement>();
  #downOnHandle = false;
  #pointerDragging = false;
  #escapeListener: ((event: KeyboardEvent) => void) | null = null;

  /** Data payload handed back in the `dragDrop` event when this item is dropped. */
  readonly dragData = input.required<unknown>();

  /** When true, this item cannot be lifted. The item remains focusable. */
  readonly dragDisabled = input(false, { transform: booleanAttribute });

  /** Emitted when a drag (keyboard or pointer) starts from this item. */
  readonly dragStart = output<ForDragStartEvent>();

  /** Emitted when a drag originating from this item ends (committed or cancelled). */
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

  protected readonly touchAction = computed<'none' | null>(() =>
    !this.effectiveDisabled() && this.#handles.size === 0 ? 'none' : null,
  );

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

    if (this.#isBrowser) {
      const host = this.#host.nativeElement;
      const onDown = (event: PointerEvent): void => {
        const target = event.target as Node | null;
        this.#downOnHandle =
          this.#handles.size === 0 ||
          (target !== null && [...this.#handles].some((h) => h.contains(target)));
      };
      host.addEventListener('pointerdown', onDown, { capture: true });
      this.#destroyRef.onDestroy(() =>
        host.removeEventListener('pointerdown', onDown, { capture: true }),
      );

      const cleanup = attachSwipeDismiss({
        element: host,
        getDirections: () => this.#dragDirections(),
        getThreshold: () => 0,
        onSwipeStart: (d) => this.#onPointerStart(d.originalEvent),
        onSwipeMove: (d) => this.#onPointerMove(d.originalEvent),
        onSwipeEnd: () => this.#onPointerEnd(),
        onSwipeCancel: () => this.#onPointerCancel(),
      });
      this.#destroyRef.onDestroy(cleanup);
      this.#destroyRef.onDestroy(() => this.#removeEscapeListener());
      this.#destroyRef.onDestroy(() => this.#clearPlaceholder());
    }
  }

  registerHandle(el: HTMLElement): void {
    this.#handles.add(el);
  }

  unregisterHandle(el: HTMLElement): void {
    this.#handles.delete(el);
  }

  readonly #allDirections: readonly SwipeDirection[] = ['left', 'right', 'up', 'down'];

  #dragDirections(): readonly SwipeDirection[] {
    return !this.effectiveDisabled() && this.#downOnHandle ? this.#allDirections : [];
  }

  #onPointerStart(event: PointerEvent): void {
    const preview = this.#buildPreview();
    const index = this.#list.pointerLift(
      this.#host.nativeElement,
      { x: event.clientX, y: event.clientY },
      preview,
    );
    if (index < 0) {
      preview?.destroy();
      return;
    }
    this.#renderPlaceholder();
    this.#pointerDragging = true;
    this.dragStart.emit({ source: this.#list, index });
    this.#addEscapeListener();
  }

  #onPointerMove(event: PointerEvent): void {
    if (!this.#pointerDragging) {
      return;
    }
    this.#list.pointerMove({ x: event.clientX, y: event.clientY });
  }

  #onPointerEnd(): void {
    if (!this.#pointerDragging) {
      return;
    }
    this.#pointerDragging = false;
    this.#removeEscapeListener();
    this.#clearPlaceholder();
    this.#list.drop();
    this.dragEnd.emit({ dropped: true });
  }

  #onPointerCancel(): void {
    if (!this.#pointerDragging) {
      return;
    }
    this.#pointerDragging = false;
    this.#removeEscapeListener();
    this.#clearPlaceholder();
    this.#list.cancel();
    this.dragEnd.emit({ dropped: false });
  }

  #addEscapeListener(): void {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && this.#pointerDragging) {
        this.#pointerDragging = false;
        this.#removeEscapeListener();
        this.#clearPlaceholder();
        this.#list.cancel();
        this.dragEnd.emit({ dropped: false });
      }
    };
    this.#escapeListener = listener;
    this.#document.addEventListener('keydown', listener);
  }

  #removeEscapeListener(): void {
    if (this.#escapeListener) {
      this.#document.removeEventListener('keydown', this.#escapeListener);
      this.#escapeListener = null;
    }
  }

  #buildPreview(): DragPreview | null {
    const preview = this.previewTpl();
    if (!preview || !this.#isBrowser) {
      return null;
    }
    const viewRef = this.#vcr.createEmbeddedView(preview.templateRef);
    viewRef.detectChanges();
    return createTemplatePreview(viewRef.rootNodes, this.#document, () => viewRef.destroy());
  }

  #renderPlaceholder(): void {
    const placeholder = this.placeholderTpl();
    if (!placeholder || !this.#isBrowser) {
      return;
    }
    this.#placeholderView = this.#vcr.createEmbeddedView(placeholder.templateRef);
    this.#placeholderView.detectChanges();
    this.placeholderActive.set(true);
  }

  #clearPlaceholder(): void {
    this.placeholderActive.set(false);
    this.#placeholderView?.destroy();
    this.#placeholderView = null;
  }

  protected onNativeDragStart(event: Event): void {
    if (this.#pointerDragging) {
      event.preventDefault();
    }
  }

  protected onFocus(): void {
    if (!this.effectiveDisabled()) {
      this.#list.setActiveItem(this.#host.nativeElement);
    }
  }

  protected onBlur(): void {
    if (this.lifted() && !this.#pointerDragging) {
      this.#list.cancel();
      this.dragEnd.emit({ dropped: false });
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.#pointerDragging) {
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
