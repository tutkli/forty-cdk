import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  output,
  PLATFORM_ID,
  type Signal,
  signal,
  untracked,
} from '@angular/core';

import {
  LiveAnnouncer,
  injectPauseController,
  type PauseController,
  attachSwipeDismiss,
  type SwipeDirection,
  type SwipeEventDetail,
} from 'forty-cdk/core';
import {
  FOR_TOAST_CONTEXT,
  type ForToastActionHandle,
  type ForToastCloseReason,
  type ForToastContext,
  type ForToastSwipeDirection,
  type ForToastTextHandle,
  type ForToastVariant,
} from './toast-context';

type SwipeState = 'start' | 'move' | 'cancel' | 'end';

/**
 * One toast notification. Apply on a `<div>` (or `<output>`, `<section>`)
 * — the directive sets `role="status"` (`'info'` / `'success'` / `'warning'`)
 * or `role="alert"` (`'error'`), `aria-live`, and the timer / pause
 * machinery.
 *
 * The directive does **not** control its own visibility. The consumer
 * mounts it (typically through `<for-toast-viewport>` for programmatic
 * toasts, or directly with `@if` for declarative ones) and unmounts it
 * when `(dismiss)` fires. Pair the unmount with `animate.leave="…"` for
 * exit animations.
 *
 * Behavior:
 * - Auto-dismisses after `duration` ms (default 5000). `0` is sticky.
 * - Hovering or focusing the toast pauses the timer; leaving / blurring
 *   resumes with the remaining time.
 * - Escape (while focus is inside) closes the toast.
 * - When `[swipeDirection]` is set, the user can drag past
 *   `[swipeThreshold]` (default 50 px) to dismiss. While the gesture is
 *   live the host reflects `data-swipe="start" | "move" | "cancel" | "end"`,
 *   `data-swipe-direction`, and the CSS variables
 *   `--for-toast-swipe-movement-x` / `--for-toast-swipe-movement-y`.
 * - The host carries `data-state="open"` while alive (no `closed` state —
 *   the consumer unmounts on close).
 */
@Directive({
  selector: '[forToast]',
  exportAs: 'forToast',
  host: {
    '[attr.role]': 'computedRole()',
    '[attr.aria-live]': 'ariaLive()',
    'aria-atomic': 'true',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    tabindex: '0',
    '[attr.data-state]': '"open"',
    '[attr.data-variant]': 'variant()',
    '[attr.data-paused]': 'paused() ? "" : null',
    '[attr.data-swipe]': 'swipeState()',
    '[attr.data-swipe-direction]': 'swipeActiveDirection()',
    '[style.--for-toast-swipe-movement-x.px]': 'swipeMovementX()',
    '[style.--for-toast-swipe-movement-y.px]': 'swipeMovementY()',
    '(pointerdown)': 'onPointerDown()',
    '(pointerenter)': 'onPause("hover")',
    '(pointerleave)': 'onResume("hover")',
    '(focusin)': 'onPause("focus")',
    '(focusout)': 'onMaybeResumeFocus($event)',
    '(keydown)': 'onKeyDown($event)',
  },
  providers: [{ provide: FOR_TOAST_CONTEXT, useExisting: ForToast }],
})
export class ForToast implements ForToastContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #announcer = inject(LiveAnnouncer);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly variant = input<ForToastVariant>('info');

  /** Auto-dismiss timer in ms. `0` keeps the toast sticky. */
  readonly duration = input(5000, { transform: numberAttribute });

  /**
   * Whether the user can dismiss the toast through an ambient gesture —
   * Escape, the close button, the auto-dismiss timer, and swipe. Defaults to
   * `true`.
   *
   * Set `false` for a sticky / forced-action toast: every ambient gesture is
   * suppressed, no auto-dismiss timer is scheduled, and a `[forToastClose]`
   * button (if present) becomes inert. The **action button stays live and is
   * the sanctioned dismissal path** — `[forToastAction]` still emits `(dismiss)`
   * with reason `'action'` so a forced-action toast (e.g. "Update available —
   * Reload") can be dismissed by the only control the user is meant to use.
   * Programmatic close via `ForToastRef.dismiss()` is also always honored.
   */
  readonly closable = input(true, { transform: booleanAttribute });

  /**
   * Direction(s) the user can swipe to dismiss the toast. Pass a
   * single direction (`'right'`) or an array of directions
   * (`['right', 'down']`). `null` (default) disables swipe.
   *
   * The swipe gesture uses pointer events, so it works for both touch
   * and mouse drags. While the user is swiping, the host reflects
   * `data-swipe="start" | "move" | "cancel" | "end"` and
   * `data-swipe-direction` plus the CSS custom properties
   * `--for-toast-swipe-movement-x` / `--for-toast-swipe-movement-y` so the
   * consumer can drive a transform-based animation entirely from CSS.
   */
  readonly swipeDirection = input<ForToastSwipeDirection>(null);

  /**
   * Pixels of pointer travel along the active swipe direction needed
   * to commit a dismissal. Defaults to `50`.
   */
  readonly swipeThreshold = input(50, { transform: numberAttribute });

  /** Emitted when the toast wants to be unmounted. The consumer reacts by removing it from the rendered list. */
  readonly dismiss = output<ForToastCloseReason>();

  /** Fired once on the move that arms the swipe. */
  readonly swipeStart = output<SwipeEventDetail>();
  /** Fired on every pointer move while the swipe is active. */
  readonly swipeMove = output<SwipeEventDetail>();
  /** Fired on pointer-up after the threshold is crossed (immediately followed by `(dismiss)`). */
  readonly swipeEnd = output<SwipeEventDetail>();
  /** Fired on pointer-up before the threshold, or on `pointercancel`. */
  readonly swipeCancel = output<SwipeEventDetail>();

  readonly #pause: PauseController<'hover' | 'focus' | 'visibility'>;
  readonly paused: Signal<boolean>;

  readonly #swipeState = signal<SwipeState | null>(null);
  readonly #swipeActiveDirection = signal<SwipeDirection | null>(null);
  readonly #swipeMovementX = signal(0);
  readonly #swipeMovementY = signal(0);

  protected readonly swipeState = this.#swipeState.asReadonly();
  protected readonly swipeActiveDirection = this.#swipeActiveDirection.asReadonly();
  protected readonly swipeMovementX = this.#swipeMovementX.asReadonly();
  protected readonly swipeMovementY = this.#swipeMovementY.asReadonly();

  readonly #normalizedSwipeDirections = computed<readonly SwipeDirection[]>(() => {
    // A non-closable toast forbids user-initiated dismissal of any kind —
    // swipe is exactly that, so disable it regardless of the input.
    if (!this.closable()) {
      return [];
    }
    const raw = this.swipeDirection();
    if (raw === null || raw === undefined) {
      return [];
    }
    if (typeof raw === 'string') {
      return [raw];
    }
    return raw;
  });

  readonly #labels = signal<readonly ForToastTextHandle[]>([]);
  readonly #descriptions = signal<readonly ForToastTextHandle[]>([]);
  readonly #actions = signal<readonly ForToastActionHandle[]>([]);
  readonly labelledBy = computed(
    () =>
      this.#labels()
        .map((h) => h.id)
        .join(' ') || null,
  );
  readonly describedBy = computed(
    () =>
      this.#descriptions()
        .map((h) => h.id)
        .join(' ') || null,
  );

  /**
   * `true` when at least one registered `[forToastAction]` carries a
   * non-empty `altText` — the WCAG 2.2.1 recovery hint the visible DOM does
   * not contain, so the toast must voice it through `LiveAnnouncer`.
   */
  readonly #hasActionAltText = computed(() =>
    this.#actions().some((a) => a.altText().trim() !== ''),
  );

  readonly #hostIsLiveRegion = computed(
    () => this.variant() === 'error' && !this.#hasActionAltText(),
  );

  /**
   * The synthesized announcement, composed reactively from the registered
   * title / description text and action `altText` signals (never re-read from
   * the DOM). Recomputes when any of those change — late-bound `altText` or a
   * `ref.update()` text change flows through here, so the announcement effect
   * re-fires on the edge instead of only once on first render.
   */
  readonly #announcement = computed(() => {
    const titles = this.#labels()
      .map((h) => h.text().trim())
      .filter(Boolean);
    const descriptions = this.#descriptions()
      .map((h) => h.text().trim())
      .filter(Boolean);
    const altTexts = this.#actions()
      .map((a) => a.altText().trim())
      .filter(Boolean);
    return [...titles, ...descriptions, ...altTexts].join('. ');
  });

  protected readonly computedRole = computed(() =>
    this.variant() === 'error' ? 'alert' : 'status',
  );
  protected readonly ariaLive = computed(() => (this.#hostIsLiveRegion() ? 'assertive' : 'off'));

  // Timer state — kept off the reactive graph because pause/resume are
  // imperative and we don't want to trip change detection on every tick.
  #timerHandle: ReturnType<typeof setTimeout> | null = null;
  #timerEndsAt = 0;
  #remainingMs = 0;
  // True once the auto-dismiss countdown has begun, so `#remainingMs` holds a
  // meaningful value. While paused this guards the duration effect from
  // clobbering a captured remaining time on an unrelated re-run (e.g. an
  // `update()` that re-renders the toast); see `#onPausedChange`.
  #timerStarted = false;

  constructor() {
    // Multi-reason pause: pointer hover, focus, and page visibility each
    // pause/resume independently. The remaining-ms capture/reschedule is
    // layered on the `paused` transition via `onChange`, keeping the timer off
    // the reactive graph (pause/resume are imperative, so a tick must not trip
    // change detection). The shared controller wires the page-visibility source
    // and tears its subscription down with this injector.
    this.#pause = injectPauseController<'hover' | 'focus' | 'visibility'>({
      onChange: (paused) => this.#onPausedChange(paused),
    });
    this.paused = this.#pause.paused;

    // Start (or reset) the auto-dismiss timer whenever `duration` /
    // `closable` changes. Pause / resume are handled imperatively in
    // `#onPausedChange`, so we read `paused()` via `untracked()` here —
    // otherwise the effect would re-run on hover and clobber the in-flight
    // remaining-ms capture. While paused with a countdown already in flight we
    // bail out entirely so the captured remaining time survives a re-render;
    // resume reschedules with that captured value rather than the full
    // duration.
    effect(() => {
      const ms = this.duration();
      const closable = this.closable();
      const paused = untracked(this.paused);
      if (paused && this.#timerStarted) {
        return;
      }
      this.#cancelTimer();
      this.#remainingMs = ms;
      this.#timerStarted = ms > 0 && closable;
      if (this.#timerStarted && !paused) {
        this.#scheduleTimer();
      }
    });
    this.#destroyRef.onDestroy(() => this.#cancelTimer());

    // Route the synthesized announcement through LiveAnnouncer's pre-existing
    // region reactively, so a late-bound `altText` and `ref.update()` text
    // changes are announced — not only the value present on first render. A
    // live region must already exist before its content changes to announce
    // reliably, and a toast is inserted with content already present, so every
    // variant routes here except a bare error, whose `role="alert"` host is the
    // one live role read reliably on insertion (see `#hostIsLiveRegion`). A
    // guard against re-announcing identical text keeps an unrelated re-render
    // from re-reading the same message. Pure side effect (an imperative
    // `LiveAnnouncer` write), so `effect()` is the correct primitive here.
    let lastAnnounced: string | null = null;
    effect(() => {
      if (this.#hostIsLiveRegion()) {
        lastAnnounced = null;
        return;
      }
      const message = this.#announcement();
      if (!message || message === lastAnnounced) {
        return;
      }
      lastAnnounced = message;
      this.#announcer.announce(message, this.variant() === 'error' ? 'assertive' : 'polite');
    });

    const detachSwipe = attachSwipeDismiss({
      element: this.#host.nativeElement,
      getDirections: () => this.#normalizedSwipeDirections(),
      getThreshold: () => this.swipeThreshold(),
      onSwipeStart: (detail) => {
        this.#swipeActiveDirection.set(detail.direction);
        this.#swipeState.set('start');
        this.#swipeMovementX.set(detail.delta.x);
        this.#swipeMovementY.set(detail.delta.y);
        this.swipeStart.emit(detail);
      },
      onSwipeMove: (detail) => {
        this.#swipeState.set('move');
        this.#swipeMovementX.set(detail.delta.x);
        this.#swipeMovementY.set(detail.delta.y);
        this.swipeMove.emit(detail);
      },
      onSwipeCancel: (detail) => {
        this.#swipeState.set('cancel');
        // Movement vars stay at the released delta so the consumer's CSS
        // transition can spring them back to zero on its own timeline. The
        // parked `data-swipe="cancel"` is cleared on the next `pointerdown`
        // (see `onPointerDown`) so it never lingers into an unrelated gesture.
        this.swipeCancel.emit(detail);
      },
      onSwipeEnd: (detail) => {
        this.#swipeState.set('end');
        this.#swipeMovementX.set(detail.delta.x);
        this.#swipeMovementY.set(detail.delta.y);
        this.swipeEnd.emit(detail);
        this.requestClose('swipe');
      },
    });
    this.#destroyRef.onDestroy(detachSwipe);
  }

  registerLabel(handle: ForToastTextHandle): void {
    this.#labels.update((arr) => (arr.includes(handle) ? arr : [...arr, handle]));
  }

  unregisterLabel(handle: ForToastTextHandle): void {
    this.#labels.update((arr) => arr.filter((h) => h !== handle));
  }

  registerDescription(handle: ForToastTextHandle): void {
    this.#descriptions.update((arr) => (arr.includes(handle) ? arr : [...arr, handle]));
  }

  unregisterDescription(handle: ForToastTextHandle): void {
    this.#descriptions.update((arr) => arr.filter((h) => h !== handle));
  }

  registerAction(handle: ForToastActionHandle): void {
    this.#actions.update((arr) => (arr.includes(handle) ? arr : [...arr, handle]));
  }

  unregisterAction(handle: ForToastActionHandle): void {
    this.#actions.update((arr) => arr.filter((h) => h !== handle));
  }

  requestClose(reason: ForToastCloseReason): void {
    if (!this.closable() && reason !== 'action' && reason !== 'programmatic') {
      return;
    }
    this.#cancelTimer();
    this.dismiss.emit(reason);
  }

  /**
   * Clear a parked swipe-cancel state at the start of the next pointer
   * interaction. After a cancel the host keeps `data-swipe="cancel"` and the
   * released movement vars so the consumer's CSS can spring the toast back; a
   * fresh `pointerdown` is the terminal reset that returns the host to a clean
   * slate (no stale `data-swipe`, zeroed movement vars) before a new gesture
   * arms. A re-armed swipe overwrites the state anyway, so this only matters
   * for the parked-after-cancel window.
   */
  protected onPointerDown(): void {
    if (this.#swipeState() === 'cancel') {
      this.#resetSwipeState();
    }
  }

  #resetSwipeState(): void {
    this.#swipeState.set(null);
    this.#swipeActiveDirection.set(null);
    this.#swipeMovementX.set(0);
    this.#swipeMovementY.set(0);
  }

  protected onPause(reason: 'hover' | 'focus'): void {
    this.#pause.apply(reason);
  }

  protected onResume(reason: 'hover' | 'focus'): void {
    this.#pause.release(reason);
  }

  protected onMaybeResumeFocus(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.onResume('focus');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.closable()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.requestClose('escape');
  }

  #onPausedChange(paused: boolean): void {
    if (paused) {
      // Pause: capture remaining time and cancel the running timer.
      if (this.#timerHandle !== null) {
        this.#remainingMs = Math.max(0, this.#timerEndsAt - Date.now());
        this.#cancelTimer();
      }
    } else if (this.duration() > 0 && this.closable() && this.#remainingMs > 0) {
      this.#scheduleTimer();
    }
  }

  #scheduleTimer(): void {
    this.#cancelTimer();
    if (!this.#isBrowser) {
      return;
    }
    this.#timerEndsAt = Date.now() + this.#remainingMs;
    this.#timerHandle = setTimeout(() => {
      this.#timerHandle = null;
      this.requestClose('auto');
    }, this.#remainingMs);
  }

  #cancelTimer(): void {
    if (this.#timerHandle !== null) {
      clearTimeout(this.#timerHandle);
      this.#timerHandle = null;
    }
  }
}
