import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { FOR_POPOVER_CONTEXT, type ForPopoverContext } from './popover-context';

/**
 * Headless implementation of the [WAI-ARIA Modeless Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * positioned against an internal trigger via `@floating-ui/dom`.
 *
 * Apply `[forPopover]` on a wrapper (the trigger and the content's `@if`
 * live inside it). The directive owns open state, ids, and the registries
 * that wire trigger / content / title / description / arrow together.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap `[forPopoverContent]` with `@if (open())` and let `animate.enter` /
 * `animate.leave` handle transitions:
 *
 * ```html
 * <div forPopover [(open)]="isOpen">
 *   <button forPopoverTrigger>Open</button>
 *   @if (isOpen()) {
 *     <div forPopoverContent animate.leave="fade-out">…</div>
 *   }
 * </div>
 * ```
 *
 * Non-modal: focus is sent into the popover on open and returned to the
 * trigger on close, but Tab is allowed to leave the surface (use Dialog
 * if you need a focus trap).
 */
@Directive({
  selector: '[forPopover]',
  exportAs: 'forPopover',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_POPOVER_CONTEXT, useExisting: ForPopover }],
})
export class ForPopover implements ForPopoverContext {
  readonly #idGen = inject(IdGenerator);

  /**
   * Two-way bindable. Whether the popover is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger click, Escape, outside dismissal), never on consumer writes
   * via `[(open)]` — observe state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * Side the popover is anchored to. Defaults to `'bottom'`. Pair with
   * `align` for the full positioning API (`side="bottom" align="start"`).
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /**
   * Gap (px) between trigger and content along the *main* axis
   * (perpendicular to `side`). Default `8`. Forwarded to floating-ui's
   * `offset` middleware. Mirrors Radix's `sideOffset`.
   */
  readonly sideOffset = input(8, { transform: numberAttribute });

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /**
   * When `true` (default), `flip` and `shift` keep the popover inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares. Default `8`. Mirrors Radix's `collisionPadding`.
   */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /**
   * Padding (px) for the `arrow` middleware so the arrow stays inside any
   * rounded corners on the popover content. Default `0`.
   */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default) lets the
   * popover shift to stay visible. `'always'` disables `shift` so the
   * popover keeps its requested placement even off-screen. `false`
   * is treated as `'partial'`.
   */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /**
   * When `true`, sets `data-detached=""` on the content while the trigger
   * has scrolled off all clipping ancestors. Use to fade out popovers
   * tied to scrolled-away triggers.
   */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When true, trigger interaction is ignored and any open popover stays
   * open until the consumer flips `open` themselves. Disable on the trigger
   * side; the content side keeps its dismissable behavior unaffected.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * When true (default), Escape, pointer-down outside, and focus outside
   * close the popover. Disable for confirm flows that must be answered
   * via `[forPopoverClose]` (or by setting `open` programmatically).
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * Where to send focus when content mounts. `'first'` (default) finds
   * the first focusable descendant; `'container'` focuses the content
   * box itself (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>('first');

  /** Manual `aria-label` on the content. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Fires when the user presses Escape while this popover is the topmost
   * dismissable layer. Call `preventDefault()` on the emitted veto to
   * suppress the automatic close. The native `KeyboardEvent` is
   * available on `.event`.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires when a pointer goes down outside the popover (and outside the
   * trigger). Call `preventDefault()` on the veto to suppress the
   * automatic close. The native `PointerEvent` is on `.event`.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the popover and trigger. Call
   * `preventDefault()` on the veto to suppress the automatic close.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside` and shares their veto state — `preventDefault()` on
   * either one suppresses the automatic close.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before the popover sends focus into itself on mount.
   * Call `preventDefault()` on the veto to skip the imperative focus
   * move — useful when opening a popover from an input you want to
   * keep focused.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly triggerId = signal(this.#idGen.next('for-popover-trigger'));
  readonly contentId = signal(this.#idGen.next('for-popover-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #anchorEl = signal<HTMLElement | null>(null);
  readonly anchor = this.#anchorEl.asReadonly();

  /**
   * The element floating-ui anchors against. Prefers `[forPopoverAnchor]`
   * when registered, otherwise falls back to the trigger so existing
   * popovers without an anchor keep their behavior.
   */
  readonly reference = computed<HTMLElement | null>(() => this.#anchorEl() ?? this.#triggerEl());

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerAnchor(el: HTMLElement): void {
    this.#anchorEl.set(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    if (this.#anchorEl() === el) {
      this.#anchorEl.set(null);
    }
  }

  registerArrow(el: HTMLElement): void {
    this.#arrowEl.set(el);
  }
  unregisterArrow(el: HTMLElement): void {
    if (this.#arrowEl() === el) {
      this.#arrowEl.set(null);
    }
  }

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((v) => !v);
  }

  // Shared veto wrapper between `pointerDownOutside` / `focusOutside` and
  // the composite `interactOutside`. The dismissable layer always invokes
  // the specific listener before the composite one for the same physical
  // event, so a `preventDefault()` in either handler vetoes the close.
  #pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.open.set(false);
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.pointerDownOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.focusOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    const veto =
      this.#pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#pendingOutsideVeto = null;
    this.interactOutside.emit(veto);
    if (!veto.defaultPrevented && this.dismissible()) {
      this.open.set(false);
    }
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}
