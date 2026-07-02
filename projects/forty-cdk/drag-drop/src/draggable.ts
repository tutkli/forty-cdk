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

import {
  registerHandle,
  resolveListNavigation,
  createPointerDragSession,
  type PointerDragSession,
  createPointerHandleGuard,
  createTemplatePreview,
  type DragPreview,
} from 'forty-cdk/core';
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

const POINTER_ARM_THRESHOLD_PX = 5;

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

  #pointerDragging = false;
  #pointerSession: PointerDragSession | null = null;

  /** Data payload handed back in the `dragDrop` event when this item is dropped. */
  readonly dragData = input.required<unknown>();

  /**
   * When true, this item cannot be lifted. The item remains focusable. It also acts as a
   * hard fence for the `liveSort` placeholder: a sibling being dragged cannot move its
   * placeholder across a pinned item (the committed drop index is unaffected).
   */
  readonly dragDisabled = input(false, { transform: booleanAttribute });

  /** Emitted when a drag (keyboard or pointer) starts from this item. */
  readonly dragStart = output<ForDragStartEvent>();

  /** Emitted when a drag originating from this item ends (committed or cancelled). */
  readonly dragEnd = output<ForDragEndEvent>();

  readonly effectiveDisabled = computed(() => this.dragDisabled() || this.#list.disabled());

  readonly #handleGuard = createPointerHandleGuard(this.effectiveDisabled);

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

  protected readonly touchAction = this.#handleGuard.touchAction;

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
      this.#pointerSession = createPointerDragSession({
        host: this.#host.nativeElement,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        cancelOnEscape: true,
        capturePointer: true,
        canStart: (event) => this.#handleGuard.canStart(event),
        onLift: (event) => this.#onPointerLift(event),
        onMove: (event) => this.#onPointerMove(event),
        onCommit: () => this.#onPointerCommit(),
        onCancel: () => this.#onPointerCancel(),
      });
      this.#destroyRef.onDestroy(() => {
        if (this.lifted()) {
          this.#list.cancel();
        }
        this.#pointerSession?.destroy();
        this.#clearPlaceholder();
      });
    }
  }

  registerHandle(el: HTMLElement): void {
    this.#handleGuard.register(el);
  }

  unregisterHandle(el: HTMLElement): void {
    this.#handleGuard.unregister(el);
  }

  #onPointerLift(event: PointerEvent): boolean {
    const preview = this.#buildPreview();
    const index = this.#list.pointerLift(
      this.#host.nativeElement,
      { x: event.clientX, y: event.clientY },
      preview,
    );
    if (index < 0) {
      preview?.destroy();
      return false;
    }
    this.#renderPlaceholder();
    this.#pointerDragging = true;
    this.dragStart.emit({ source: this.#list, index });
    return true;
  }

  #onPointerMove(event: PointerEvent): void {
    this.#list.pointerMove({ x: event.clientX, y: event.clientY });
  }

  #onPointerCommit(): void {
    this.#pointerDragging = false;
    this.#clearPlaceholder();
    this.#list.drop();
    this.dragEnd.emit({ dropped: true });
  }

  #onPointerCancel(): void {
    if (!this.#pointerDragging) {
      return;
    }
    this.#pointerDragging = false;
    this.#clearPlaceholder();
    this.#list.cancel();
    this.dragEnd.emit({ dropped: false });
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
    this.#list.setLivePlaceholder(this.#placeholderView.rootNodes);
  }

  #clearPlaceholder(): void {
    this.#list.setLivePlaceholder(null);
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
