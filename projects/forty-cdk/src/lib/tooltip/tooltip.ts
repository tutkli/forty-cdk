import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import {
  createHoverIntent,
  type HoverIntentScheduler,
} from '../_internal/hover-intent/hover-intent';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  FOR_TOOLTIP_CONTEXT,
  type ForTooltipContext,
  type TooltipScheduleReason,
} from './tooltip-context';
import { TooltipCoordinator } from './tooltip-defaults';

/**
 * Headless implementation of the [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
 *
 * Wrapper directive that owns open / closed state, hover / focus delays, and
 * placement. Provides the shared context to `ForTooltipTrigger`,
 * `ForTooltipContent`, and the optional `ForTooltipArrow`.
 *
 * Tooltip content is portaled to `document.body` and positioned via
 * `@floating-ui/dom`. Per APG, content must NOT be interactive — for
 * interactive popups use a Popover primitive (not yet shipped).
 */
@Directive({
  selector: '[forTooltip]',
  exportAs: 'forTooltip',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_TOOLTIP_CONTEXT, useExisting: ForTooltip }],
})
export class ForTooltip implements ForTooltipContext {
  readonly #idGen = inject(IdGenerator);

  /**
   * Two-way bindable. Whether the tooltip is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (hover/focus delays, Escape, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]` — observe
   * state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * Side the tooltip is anchored to. Defaults to `'top'`. Pair with
   * `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('top');

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /**
   * Gap (px) between trigger and content along the main axis.
   * Default `8`. Mirrors Radix's `sideOffset`.
   */
  readonly sideOffset = input(8, { transform: numberAttribute });

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /**
   * When `true` (default), `flip` and `shift` keep the tooltip inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares. Default `8`.
   */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default) lets the
   * tooltip shift to stay visible. `'always'` keeps the requested
   * placement even off-screen.
   */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /**
   * When `true`, sets `data-detached=""` while the trigger has scrolled
   * off all clipping ancestors.
   */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * Per-tooltip override for the open delay (ms). When `undefined`
   * (default), falls back to `ForTooltipDefaults.openDelay` from the
   * surrounding `provideForTooltipDefaults` scope (700ms unless configured).
   */
  readonly openDelay = input<number | undefined>(undefined);

  /**
   * Per-tooltip override for the close delay (ms) after hover or focus
   * leaves. `Escape` ignores this. When `undefined` (default), falls back to
   * `ForTooltipDefaults.closeDelay` from the surrounding
   * `provideForTooltipDefaults` scope (300ms unless configured).
   */
  readonly closeDelay = input<number | undefined>(undefined);

  /** When true, all hover / focus interaction is ignored and any open tooltip is forced closed. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly triggerId = signal(this.#idGen.next('for-tooltip-trigger'));
  readonly contentId = signal(this.#idGen.next('for-tooltip-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

  readonly #coordinator = inject(TooltipCoordinator);
  readonly #hoverIntent: HoverIntentScheduler;

  constructor() {
    // Force-close when `disabled` flips to true. The scheduler already
    // early-returns on `disabled()` so hover/focus can't open a disabled
    // tooltip; this isolated reaction only covers the remaining path — an open
    // tooltip being disabled out from under itself. The `open` read is
    // `untracked` so this never re-runs as a function of `open` (no read+write
    // cycle on the same signal); it reacts to `disabled` alone. This is the
    // documented, intentional `effect()`-to-set carve-out (CLAUDE.md): it
    // integrates the disabled gate with the public `model()` instead of
    // wrapping the model in a parallel signal.
    effect(() => {
      if (this.disabled() && untracked(this.open)) {
        this.cancelPending();
        this.open.set(false);
      }
    });

    this.#hoverIntent = createHoverIntent({
      open: this.open,
      isDisabled: () => this.disabled(),
      openDelay: () => this.openDelay() ?? this.#coordinator.openDelay,
      closeDelay: () => this.closeDelay() ?? this.#coordinator.closeDelay,
      coordinator: this.#coordinator,
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

  scheduleOpen(_reason: TooltipScheduleReason): void {
    this.#hoverIntent.scheduleOpen();
  }

  scheduleClose(reason: TooltipScheduleReason): void {
    this.#hoverIntent.scheduleClose(reason === 'escape');
  }

  cancelPending(): void {
    this.#hoverIntent.cancelPending();
  }
}
