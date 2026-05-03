import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import type { Placement } from '@floating-ui/dom';
import { distinctUntilChanged } from 'rxjs';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import {
  FOR_HOVER_CARD_CONTEXT,
  type ForHoverCardContext,
  type HoverCardScheduleReason,
} from './hover-card-context';
import { HoverCardCoordinator } from './hover-card-defaults';

/**
 * Headless hover-preview card. Use it to surface rich, interactive previews
 * (profile snapshots, link previews, definition cards) on hover or focus
 * of an already-meaningful trigger (a link, a name).
 *
 * **Not a tooltip.** Hover-cards may contain interactive content
 * (clickable links, copy buttons, …); the trigger must convey full meaning
 * on its own so keyboard-only users miss nothing.
 *
 * Open / close delays default to 700 / 300 ms; the per-injector-scope
 * `provideHoverCardDefaults` configures the cadence and the skip-delay
 * window for adjacent cards.
 *
 * @example
 * ```html
 * <span forHoverCard #card="forHoverCard">
 *   <a forHoverCardTrigger href="/users/ada">Ada Lovelace</a>
 *   @if (card.open()) {
 *     <div forHoverCardContent animate.enter="fade-in" animate.leave="fade-out">
 *       <img src="/api/avatar/ada" alt="" />
 *       <h3>Ada Lovelace</h3>
 *       <p>Mathematician.</p>
 *     </div>
 *   }
 * </span>
 * ```
 */
@Directive({
  selector: '[forHoverCard]',
  exportAs: 'forHoverCard',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_HOVER_CARD_CONTEXT, useExisting: ForHoverCard }],
})
export class ForHoverCard implements ForHoverCardContext {
  /**
   * Two-way bindable. Whether the card is currently shown. `(openChange)`
   * fires only on internal transitions (delay-driven, escape, blur, and the
   * force-close that runs when `disabled` flips to true), never on consumer
   * writes through `[(open)]`.
   *
   * Backed by a `linkedSignal` whose source is `disabled` so the documented
   * "force-close while disabled" contract is enforced declaratively, without
   * an `effect()`-to-set anti-pattern.
   */
  readonly open: WritableSignal<boolean>;

  /** Emits when the directive itself transitions `open`. See `open` JSDoc. */
  readonly openChange = output<boolean>();

  /**
   * Backing input for `[(open)]` two-way binding. Internal — read the
   * user-facing `open` writable signal instead, which derives its value
   * from this input plus `disabled` via `linkedSignal`.
   *
   * @internal
   */
  readonly _openInput = input(false, {
    alias: 'open',
    transform: booleanAttribute,
  });

  /**
   * Floating-ui placement. Default `'top'`. Legacy single-string API —
   * new code should prefer the `side` + `align` pair.
   */
  readonly placement = input<Placement>('top');

  /**
   * Side the card is anchored to. When set, takes precedence over
   * `placement`. Pair with `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /** Gap (px) between trigger and card along the main axis. Default `8`. Legacy alias for `sideOffset`. */
  readonly offset = input<number>(8);

  /**
   * Gap (px) along the main axis. When set, overrides the legacy `offset`.
   * Identical semantics to Radix's `sideOffset`.
   */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the card inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /** Per-card override for open delay (ms). Falls back to coordinator (700ms). */
  readonly openDelay = input<number | undefined>(undefined);

  /** Per-card override for close delay (ms). Falls back to coordinator (300ms). */
  readonly closeDelay = input<number | undefined>(undefined);

  /** When true, all hover / focus interaction is ignored and any open card is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Fires when the user presses Escape while the card is open, regardless of
   * whether focus is on the trigger or inside the portaled content. Call
   * `event.preventDefault()` to suppress the automatic close.
   */
  readonly escapeKeyDown = output<KeyboardEvent>();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  #pendingTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #coordinator = inject(HoverCardCoordinator);

  constructor() {
    this.open = linkedSignal<{ input: boolean; disabled: boolean }, boolean>({
      source: () => ({ input: this._openInput(), disabled: this.disabled() }),
      computation: ({ input, disabled }, prev) => {
        if (disabled) return false;
        if (!prev || prev.source.input !== input) return input;
        return prev.value;
      },
    });

    // Bridge: emit `openChange` whenever `open` diverges from the consumer's
    // `[open]` input. That covers internal transitions (delay timers, escape,
    // blur) AND the linkedSignal-driven force-close when `disabled` flips
    // (or when the consumer tries to open while disabled). Consumer-driven
    // `[(open)]` writes propagate through the linkedSignal so `open === input`
    // again, and stay silent — preserving the documented `model()`-style
    // contract. This is not a state-deriving effect — it only invokes the
    // imperative output emitter — so it is consistent with CLAUDE.md's
    // "no propagate state in effect" rule (replaced here by `linkedSignal`).
    const divergence = computed(() => ({ open: this.open(), input: this._openInput() }));
    toObservable(divergence)
      .pipe(
        distinctUntilChanged((a, b) => a.open === b.open && a.input === b.input),
        takeUntilDestroyed(),
      )
      .subscribe(({ open, input }) => {
        if (open !== input) {
          this.openChange.emit(open);
        }
      });

    inject(DestroyRef).onDestroy(() => this.cancelPending());
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
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

  scheduleOpen(_reason: HoverCardScheduleReason): void {
    if (this.disabled()) {
      return;
    }
    this.cancelPending();
    if (this.open()) {
      return;
    }
    const local = this.openDelay();
    const base = this.#coordinator.skipDelay() ? 0 : (local ?? this.#coordinator.openDelay);
    const delay = Math.max(0, base);
    if (delay === 0) {
      this.open.set(true);
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.open.set(true);
    }, delay);
  }

  scheduleClose(reason: HoverCardScheduleReason): void {
    this.cancelPending();
    if (!this.open()) {
      return;
    }
    if (reason === 'escape') {
      this.#close();
      return;
    }
    const local = this.closeDelay();
    const delay = Math.max(0, local ?? this.#coordinator.closeDelay);
    if (delay === 0) {
      this.#close();
      return;
    }
    this.#pendingTimer = setTimeout(() => {
      this.#pendingTimer = null;
      this.#close();
    }, delay);
  }

  #close(): void {
    this.open.set(false);
    this.#coordinator.startSkipDelay();
  }

  cancelPending(): void {
    if (this.#pendingTimer !== null) {
      clearTimeout(this.#pendingTimer);
      this.#pendingTimer = null;
    }
  }

  /**
   * Emit `(escapeKeyDown)` and, unless the consumer calls `preventDefault()`
   * on the event, close immediately. Called by the trigger and the portaled
   * content so Escape works no matter where focus currently lives.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented) {
      event.preventDefault();
      event.stopPropagation();
      this.scheduleClose('escape');
    }
  }
}
