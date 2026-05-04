import {
  afterNextRender,
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
  signal,
  untracked,
} from '@angular/core';

import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import {
  FOR_TOAST_CONTEXT,
  type ForToastActionHandle,
  type ForToastCloseReason,
  type ForToastContext,
  type ForToastVariant,
} from './toast-context';

/**
 * One toast notification. Apply on a `<div>` (or `<output>`, `<section>`)
 * — the directive sets `role="status"` (`'info'` / `'success'` / `'warning'`)
 * or `role="alert"` (`'error'`), `aria-live`, and the timer / pause
 * machinery.
 *
 * The directive does **not** control its own visibility. The consumer
 * mounts it (typically through `<for-toast-viewport>` for programmatic
 * toasts, or directly with `@if` for declarative ones) and unmounts it
 * when `(close)` fires. Pair the unmount with `animate.leave="…"` for
 * exit animations.
 *
 * Behavior:
 * - Auto-dismisses after `duration` ms (default 5000). `0` is sticky.
 * - Hovering or focusing the toast pauses the timer; leaving / blurring
 *   resumes with the remaining time.
 * - Escape (while focus is inside) closes the toast.
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

  readonly variant = input<ForToastVariant>('info');

  /** Auto-dismiss timer in ms. `0` keeps the toast sticky. */
  readonly duration = input(5000, { transform: numberAttribute });

  /**
   * Whether Escape and the close button can dismiss the toast. Defaults to
   * `true`. Set `false` for a sticky / forced-action toast — the consumer
   * must dismiss programmatically (e.g. via the `(close)` output after the
   * action button has been clicked).
   */
  readonly closable = input(true, { transform: booleanAttribute });

  /** Emitted when the toast wants to be unmounted. The consumer reacts by removing it from the rendered list. */
  readonly close = output<ForToastCloseReason>();

  readonly #paused = signal(false);
  readonly paused = this.#paused.asReadonly();
  readonly #pauseReasons = new Set<'hover' | 'focus' | 'visibility'>();

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #descIds = signal<readonly string[]>([]);
  readonly #actions = signal<readonly ForToastActionHandle[]>([]);
  readonly labelledBy = computed(() => this.#labelIds().join(' ') || null);
  readonly describedBy = computed(() => this.#descIds().join(' ') || null);

  /**
   * `true` when at least one registered `[forToastAction]` carries a
   * non-empty `altText`. In that mode the host's `aria-live` is silenced
   * and the announcement is composed and routed through `LiveAnnouncer`.
   */
  readonly #hasActionAltText = computed(() =>
    this.#actions().some((a) => a.altText().trim() !== ''),
  );

  protected readonly computedRole = computed(() =>
    this.variant() === 'error' ? 'alert' : 'status',
  );
  protected readonly ariaLive = computed(() => {
    if (this.#hasActionAltText()) {
      return 'off';
    }
    return this.variant() === 'error' ? 'assertive' : 'polite';
  });

  // Timer state — kept off the reactive graph because pause/resume are
  // imperative and we don't want to trip change detection on every tick.
  #timerHandle: ReturnType<typeof setTimeout> | null = null;
  #timerEndsAt = 0;
  #remainingMs = 0;

  constructor() {
    // Start (or reset) the auto-dismiss timer whenever `duration` changes.
    // Pause / resume are handled imperatively in `#updatePaused`, so we read
    // `#paused()` via `untracked()` here — otherwise the effect would re-run
    // on hover and clobber the in-flight remaining-ms capture.
    effect(() => {
      const ms = this.duration();
      this.#cancelTimer();
      this.#remainingMs = ms;
      if (ms > 0 && !untracked(() => this.#paused())) {
        this.#scheduleTimer();
      }
    });
    this.#destroyRef.onDestroy(() => this.#cancelTimer());

    // After the first render every child directive (title / description /
    // action) has registered, so we can compose the synthesized announcement
    // and push it through LiveAnnouncer. Only fires when at least one action
    // carries `altText` — otherwise the host's `aria-live` already does the
    // job and we'd cause a duplicate readout.
    afterNextRender(() => {
      if (!this.#hasActionAltText()) {
        return;
      }
      const message = this.#composeAnnouncement();
      if (message) {
        this.#announcer.announce(message, this.variant() === 'error' ? 'assertive' : 'polite');
      }
    });
  }

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }

  registerDescription(id: string): void {
    this.#descIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  unregisterDescription(id: string): void {
    this.#descIds.update((arr) => arr.filter((x) => x !== id));
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
    this.close.emit(reason);
  }

  protected onPause(reason: 'hover' | 'focus'): void {
    this.#pauseReasons.add(reason);
    this.#updatePaused();
  }

  protected onResume(reason: 'hover' | 'focus'): void {
    this.#pauseReasons.delete(reason);
    this.#updatePaused();
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

  #updatePaused(): void {
    const next = this.#pauseReasons.size > 0;
    if (next === this.#paused()) {
      return;
    }
    this.#paused.set(next);
    if (next) {
      // Pause: capture remaining time and cancel the running timer.
      if (this.#timerHandle !== null) {
        this.#remainingMs = Math.max(0, this.#timerEndsAt - Date.now());
        this.#cancelTimer();
      }
    } else if (this.duration() > 0 && this.#remainingMs > 0) {
      this.#scheduleTimer();
    }
  }

  #scheduleTimer(): void {
    this.#cancelTimer();
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

  #composeAnnouncement(): string {
    const root = this.#host.nativeElement.ownerDocument;
    const lookup = (id: string): string => (root.getElementById(id)?.textContent ?? '').trim();
    const titles = this.#labelIds().map(lookup).filter(Boolean);
    const descriptions = this.#descIds().map(lookup).filter(Boolean);
    const altTexts = this.#actions()
      .map((a) => a.altText().trim())
      .filter(Boolean);
    return [...titles, ...descriptions, ...altTexts].join('. ');
  }
}
