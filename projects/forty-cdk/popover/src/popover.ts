import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';

import {
  AnchoredOverlayPositioningBase,
  adoptHostId,
  CloseReasonState,
  IdGenerator,
  injectPrefersReducedMotion,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  FOR_POPOVER_CONTEXT,
  type ForPopoverCloseReason,
  type ForPopoverContext,
} from './popover-context';
import { FOR_POPOVER_DEFAULTS } from './popover-defaults';

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
    '[attr.data-reduced-motion]': 'reducedMotion() ? "" : null',
  },
  providers: [{ provide: FOR_POPOVER_CONTEXT, useExisting: ForPopover }],
})
export class ForPopover extends AnchoredOverlayPositioningBase implements ForPopoverContext {
  readonly #idGen = inject(IdGenerator);
  protected readonly positioningDefaults = inject(FOR_POPOVER_DEFAULTS);

  /**
   * Two-way bindable. Whether the popover is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger click, Escape, outside dismissal), never on consumer writes
   * via `[(open)]` — observe state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * When true, trigger interaction is ignored and any open popover stays
   * open until the consumer flips `open` themselves. Disable on the trigger
   * side; the content side keeps its dismissible behavior unaffected.
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
   * Whether the user has requested reduced motion via the OS
   * `prefers-reduced-motion: reduce` media query. Reflected as the boolean
   * `data-reduced-motion` attribute on the root and content so consumers can
   * disable their own `animate.enter` / `animate.leave` and CSS transitions
   * without re-deriving the media query. The popover toggles open / closed
   * synchronously on trigger click, so it has no JS-coordinated timing to skip.
   */
  readonly reducedMotion = injectPrefersReducedMotion();

  /**
   * Fires when the user presses Escape while this popover is the topmost
   * dismissible layer. Call `preventDefault()` on the emitted veto to
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

  readonly #closeReasonState = new CloseReasonState<ForPopoverCloseReason>();

  /**
   * Reason of the most recent close, or `null` while open / before any close.
   * Reset on open, set on every close path — the content reads it to skip its
   * trigger return-focus on an outside-interaction close.
   */
  readonly lastCloseReason = this.#closeReasonState.reason;

  registerTrigger(el: HTMLElement): void {
    adoptHostId(el, this.triggerId);
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  /**
   * Adopts a consumer-set static `id` on the `[forPopoverContent]` host into
   * `contentId` (preserving anchors / external `aria-labelledby` references)
   * instead of letting the `[id]` host binding clobber it.
   */
  adoptContentId(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
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
    if (this.open()) {
      this.#close('programmatic');
    } else {
      this.#closeReasonState.reset();
      this.open.set(true);
    }
  }

  /**
   * Close the popover. Honored regardless of `dismissible` — an explicit close
   * is always applied. Used by `[forPopoverClose]`.
   */
  close(): void {
    this.#close('programmatic');
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.#close('escape');
    }
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside` lives in `injectOverlayShell`; these only fire the
   * matching output with the veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.interactOutside.emit(veto);
  }

  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction. Records the channel's reason so the content skips its trigger
   * return-focus, then closes.
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.#close(reason);
  }

  /**
   * Single close choke point: records the reason as `lastCloseReason`, then
   * flips `open` to `false`. Guarded on `open()` so a stale late event can't
   * clobber the reason of an already-closed popover.
   */
  #close(reason: ForPopoverCloseReason): void {
    if (!this.open()) {
      return;
    }
    this.#closeReasonState.set(reason);
    this.open.set(false);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}
