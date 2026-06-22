import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { resolveDropTarget } from '../_internal/drag-session/drag-geometry';
import {
  isDragLiftKey,
  resolveLiftedDragControl,
} from '../_internal/drag-session/keyboard-drag-keys';
import { createKeyboardDragMediator } from '../_internal/drag-session/keyboard-drag-mediator';
import {
  createPointerDragSession,
  type PointerDragSession,
} from '../_internal/drag-session/pointer-session';
import { PreviewController } from '../_internal/drag-session/preview-controller';
import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectListboxContext, type ForListboxContext } from './listbox-context';
import {
  announceReorderCancel,
  announceReorderDrop,
  announceReorderLift,
  announceReorderMove,
} from './listbox-reorder-announcements';

const POINTER_ARM_THRESHOLD_PX = 5;

type ReorderMode = 'idle' | 'keyboard' | 'pointer';

type ReorderAction = 'cancel' | 'commit' | 'next' | 'prev' | 'first' | 'last';

/** Payload of `optionReorder`: the lifted option's previous and new index, both 0-based. */
export interface ForListboxReorderEvent {
  /** The lifted option's index before the move, in DOM (rendered) order. */
  readonly from: number;
  /** The option's index after the move — pass to `moveItemInArray(items, from, to)`. */
  readonly to: number;
}

/**
 * Resolves a lifted-drag keydown to a reorder action. `Escape` / `Tab` cancel and
 * `Space` / `Enter` commit (shared with the tree coordinator); arrow keys step the target
 * linearly in DOM order (both axes, so a wrapping chip grid reorders by either pair), and
 * `Home` / `End` jump to the ends. Honors writing direction for the horizontal arrows.
 */
function resolveReorderAction(event: KeyboardEvent, dir: WritingDirection): ReorderAction | null {
  const control = resolveLiftedDragControl(event);
  if (control) {
    return control;
  }
  const isRtl = dir === 'rtl';
  switch (event.key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'prev';
    case 'ArrowRight':
      return isRtl ? 'prev' : 'next';
    case 'ArrowLeft':
      return isRtl ? 'next' : 'prev';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

/**
 * Opt-in **pointer + keyboard reordering** for `ForListbox`, composed onto the same element as
 * `[forListbox]`.
 *
 * `[forDraggable]` cannot stack on a `[forListboxOption]` — both would manage the option's
 * roving tabindex and keyboard, colliding on `tabindex`, on Space / Enter activation, and on the
 * container `orientation` input. This coordinator is the listbox-side analogue of
 * `ForTreeNodeDrag` / `ForTableRowReorder`: it lives on the container, **never touches the
 * option's roving tabindex**, intercepts keys in the capture phase, and owns its own 2D drop
 * geometry — so the listbox keeps full selection + typeahead behavior while becoming sortable.
 *
 * Keyboard: focus an option, press `Ctrl+Space` (or `Cmd+Space`) to lift. While lifted, the
 * arrow keys step the target position (linearly in DOM order, so a wrapping chip grid works with
 * either axis), `Home` / `End` jump to the ends, `Space` / `Enter` drop, `Escape` / `Tab` cancel.
 *
 * Pointer: drag an option past a small threshold to reorder; a short press without movement still
 * selects (the post-drag click is suppressed). A floating preview follows the pointer; drop
 * geometry is resolved in 2D, so vertical lists, horizontal lists, and wrapping grids all work
 * without configuring `orientation`.
 *
 * It **never reorders the options itself** (BYO-data): `(optionReorder)` emits the previous / new
 * index on every committed drop; apply `moveItemInArray(items, from, to)` to your own array.
 * Intended for the standard roving-tabindex listbox; a virtualized listbox (`[totalCount]` set)
 * is left untouched, since reordering a windowed subset is ill-defined.
 *
 * @example
 * ```html
 * <ul forListbox forListboxReorder multiple [(value)]="selected" (optionReorder)="reorder($event)">
 *   @for (tag of tags(); track tag) {
 *     <li><button type="button" forListboxOption [value]="tag">{{ tag }}</button></li>
 *   }
 * </ul>
 * ```
 */
@Directive({
  selector: '[forListboxReorder]',
  exportAs: 'forListboxReorder',
  host: {
    '[attr.data-dragging]': '_dragging() ? "" : null',
  },
})
export class ForListboxReorder {
  readonly #ctx: ForListboxContext = injectListboxContext('ForListboxReorder');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #announcer = inject(LiveAnnouncer);
  readonly #destroyRef = inject(DestroyRef);

  /**
   * Disables reorder interactions while leaving selection / typeahead intact. Named distinctly
   * from the listbox's own `disabled` so the two never share a single `[disabled]` binding on the
   * shared host. The listbox being disabled (its own `disabled` or a surrounding `[forFieldset]`)
   * also disables reorder.
   */
  readonly reorderDisabled = input(false, { transform: booleanAttribute });

  /** Emitted once per committed reorder gesture with the previous / new option index. */
  readonly optionReorder = output<ForListboxReorderEvent>();

  protected readonly _dragging = signal(false);

  #mode: ReorderMode = 'idle';
  #liftedHost: HTMLElement | null = null;
  #fromIndex = 0;
  #targetIndex = 0;
  #label = '';
  #previewController: PreviewController | null = null;
  #pointerSession: PointerDragSession | null = null;

  constructor() {
    createKeyboardDragMediator({
      host: this.#host,
      isBrowser: this.#isBrowser,
      destroyRef: this.#destroyRef,
      isLifted: () => this.#mode === 'keyboard',
      onIdleKeydown: (event) => this.#onIdleKeydown(event),
      onLiftedKeydown: (event) => this.#onLiftedKeydown(event),
      onFocusOut: (event) => this.#onFocusOut(event),
    });

    if (this.#isBrowser) {
      this.#pointerSession = createPointerDragSession({
        host: this.#host,
        document: this.#document,
        armThreshold: POINTER_ARM_THRESHOLD_PX,
        cancelOnEscape: true,
        capturePointer: true,
        canStart: (event) => this.#canStartPointer(event),
        onLift: (event) => this.#onPointerLift(event),
        onMove: (event) => this.#onPointerMove(event),
        onCommit: (event) => this.#onPointerCommit(event),
        onCancel: () => this.#onPointerCancel(),
      });
      this.#destroyRef.onDestroy(() => {
        this.#pointerSession?.destroy();
        if (this.#mode !== 'idle') {
          this.#clearSession();
        }
      });
    }
  }

  #reorderable(): boolean {
    return (
      !this.reorderDisabled() &&
      !this.#ctx.effectiveDisabled() &&
      this.#ctx.totalCount() === undefined
    );
  }

  #resolveOption(target: EventTarget | null): { host: HTMLElement; index: number } | null {
    if (!(target instanceof Node)) {
      return null;
    }
    const options = this.#ctx.options();
    for (let i = 0; i < options.length; i++) {
      const option = options[i]!;
      if (option.host === target || option.host.contains(target)) {
        return option.disabled() ? null : { host: option.host, index: i };
      }
    }
    return null;
  }

  #canStartPointer(event: PointerEvent): boolean {
    if (!this.#reorderable() || (event.pointerType === 'mouse' && event.button !== 0)) {
      return false;
    }
    const resolved = this.#resolveOption(event.target);
    if (!resolved) {
      return false;
    }
    this.#liftedHost = resolved.host;
    this.#fromIndex = resolved.index;
    return true;
  }

  #onPointerLift(event: PointerEvent): boolean {
    if (this.#liftedHost === null) {
      return false;
    }
    this.#lift(this.#liftedHost, this.#fromIndex, 'pointer', {
      x: event.clientX,
      y: event.clientY,
    });
    return true;
  }

  #onPointerMove(event: PointerEvent): void {
    if (this.#mode !== 'pointer') {
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    this.#previewController?.moveTo(point);
    this.#setTarget(this.#resolvePointerTarget(point), 'polite');
  }

  #onPointerCommit(event: PointerEvent): void {
    if (this.#mode !== 'pointer') {
      return;
    }
    this.#targetIndex = this.#resolvePointerTarget({ x: event.clientX, y: event.clientY });
    this.#commit();
  }

  #onPointerCancel(): void {
    if (this.#mode !== 'pointer') {
      return;
    }
    this.#cancel();
  }

  #resolvePointerTarget(point: { x: number; y: number }): number {
    const lifted = this.#liftedHost;
    const itemRects = this.#ctx
      .options()
      .filter((option) => option.host !== lifted)
      .map((option) => option.host.getBoundingClientRect());
    const target = resolveDropTarget(
      point,
      [{ rect: this.#host.getBoundingClientRect(), itemRects }],
      'mixed',
      this.#ctx.dir(),
    );
    return target ? target.index : this.#targetIndex;
  }

  #onIdleKeydown(event: KeyboardEvent): void {
    if (this.#mode !== 'idle' || !isDragLiftKey(event) || !this.#reorderable()) {
      return;
    }
    const resolved = this.#resolveOption(event.target);
    if (!resolved) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#lift(resolved.host, resolved.index, 'keyboard');
  }

  #onLiftedKeydown(event: KeyboardEvent): void {
    const action = resolveReorderAction(event, this.#ctx.dir());
    if (action === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    switch (action) {
      case 'cancel':
        this.#cancel();
        return;
      case 'commit':
        this.#commit();
        return;
      case 'next':
        this.#setTarget(this.#targetIndex + 1, 'polite');
        return;
      case 'prev':
        this.#setTarget(this.#targetIndex - 1, 'polite');
        return;
      case 'first':
        this.#setTarget(0, 'polite');
        return;
      case 'last':
        this.#setTarget(this.#ctx.options().length - 1, 'polite');
        return;
    }
  }

  #onFocusOut(event: FocusEvent): void {
    if (this.#mode !== 'keyboard') {
      return;
    }
    const related = event.relatedTarget as HTMLElement | null;
    if (related && this.#host.contains(related)) {
      return;
    }
    this.#cancel();
  }

  #lift(
    host: HTMLElement,
    index: number,
    mode: 'keyboard' | 'pointer',
    point?: { x: number; y: number },
  ): void {
    this.#mode = mode;
    this.#liftedHost = host;
    this.#fromIndex = index;
    this.#targetIndex = index;
    this.#label = (host.textContent ?? '').trim();
    host.setAttribute('data-dragging', '');
    this._dragging.set(true);

    if (mode === 'pointer' && point) {
      this.#previewController = new PreviewController({
        source: host,
        point,
        preview: null,
        doc: this.#document,
        boundary: null,
        lockAxis: () => null,
      });
    }

    this.#announcer.announce(
      announceReorderLift(this.#label, index + 1, this.#ctx.options().length),
      'assertive',
    );
  }

  #setTarget(to: number, politeness: 'polite' | 'assertive'): void {
    const total = this.#ctx.options().length;
    const clamped = Math.max(0, Math.min(total - 1, to));
    if (clamped === this.#targetIndex) {
      return;
    }
    this.#targetIndex = clamped;
    this.#announcer.announce(announceReorderMove(this.#label, clamped + 1, total), politeness);
  }

  #commit(): void {
    if (this.#mode === 'idle' || this.#liftedHost === null) {
      return;
    }
    const total = this.#ctx.options().length;
    const to = Math.max(0, Math.min(total - 1, this.#targetIndex));
    const from = this.#fromIndex;
    const label = this.#label;
    this.#clearSession();
    this.optionReorder.emit({ from, to });
    this.#announcer.announce(announceReorderDrop(label, to + 1, total), 'assertive');
  }

  #cancel(): void {
    if (this.#mode === 'idle') {
      return;
    }
    const label = this.#label;
    this.#clearSession();
    this.#announcer.announce(announceReorderCancel(label), 'assertive');
  }

  #clearSession(): void {
    this.#liftedHost?.removeAttribute('data-dragging');
    this.#mode = 'idle';
    this.#liftedHost = null;
    this.#fromIndex = 0;
    this.#targetIndex = 0;
    this.#label = '';
    this.#previewController?.destroy();
    this.#previewController = null;
    this._dragging.set(false);
  }
}
