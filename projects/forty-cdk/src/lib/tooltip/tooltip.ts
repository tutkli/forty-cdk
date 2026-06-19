import {
  booleanAttribute,
  computed,
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
import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  FOR_TOOLTIP_CONTEXT,
  type ForTooltipContext,
  type TooltipScheduleReason,
} from './tooltip-context';
import { FOR_TOOLTIP_DEFAULTS, TooltipCoordinator } from './tooltip-defaults';

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
  readonly #defaults = inject(FOR_TOOLTIP_DEFAULTS);

  /**
   * Two-way bindable. Whether the tooltip is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (hover/focus delays, Escape, and the force-close that runs when `disabled`
   * flips to true), never on consumer writes through `[(open)]` — observe
   * state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * Per-tooltip override for the side the tooltip is anchored to. Pair with
   * `align` for the full positioning API. When `undefined` (default), falls
   * back to `ForTooltipDefaults.side` from the surrounding
   * `provideForTooltipDefaults` scope (`'top'` unless configured).
   *
   * The input is aliased to `side`; consumers bind `[side]="..."` and read
   * the effective value via the public `side` computed below.
   */
  readonly _sideInput = input<FloatingSide | undefined>(undefined, { alias: 'side' });

  /** Effective anchor side: the `side` input when set, else the scope default. */
  readonly side = computed<FloatingSide>(() => this._sideInput() ?? this.#defaults.side);

  /**
   * Per-tooltip override for the alignment along the chosen `side`. When
   * `undefined` (default), falls back to `ForTooltipDefaults.align` from the
   * surrounding `provideForTooltipDefaults` scope (`'center'` unless
   * configured).
   *
   * The input is aliased to `align`; consumers bind `[align]="..."` and read
   * the effective value via the public `align` computed below.
   */
  readonly _alignInput = input<FloatingAlign | undefined>(undefined, { alias: 'align' });

  /** Effective alignment: the `align` input when set, else the scope default. */
  readonly align = computed<FloatingAlign>(() => this._alignInput() ?? this.#defaults.align);

  /**
   * Per-tooltip override for the gap (px) between trigger and content along
   * the main axis. When `undefined` (default),
   * falls back to `ForTooltipDefaults.sideOffset` from the surrounding
   * `provideForTooltipDefaults` scope (`8` unless configured).
   *
   * The input is aliased to `sideOffset`; consumers bind `[sideOffset]="..."`
   * and read the effective value via the public `sideOffset` computed below.
   */
  readonly _sideOffsetInput = input(undefined, {
    alias: 'sideOffset',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective main-axis gap (px): the `sideOffset` input when set, else the scope default. */
  readonly sideOffset = computed<number>(
    () => this._sideOffsetInput() ?? this.#defaults.sideOffset,
  );

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /**
   * When `true` (default), `flip` and `shift` keep the tooltip inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Per-tooltip override for the padding (px) applied uniformly to the
   * `flip`, `shift`, and `size` middlewares. When `undefined` (default),
   * falls back to `ForTooltipDefaults.collisionPadding` from the surrounding
   * `provideForTooltipDefaults` scope (`8` unless configured).
   *
   * The input is aliased to `collisionPadding`; consumers bind
   * `[collisionPadding]="..."` and read the effective value via the public
   * `collisionPadding` computed below.
   */
  readonly _collisionPaddingInput = input(undefined, {
    alias: 'collisionPadding',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective collision padding (px): the `collisionPadding` input when set, else the scope default. */
  readonly collisionPadding = computed<number>(
    () => this._collisionPaddingInput() ?? this.#defaults.collisionPadding,
  );

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
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });

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

  readonly #generatedTriggerId = this.#idGen.next('for-tooltip-trigger');

  /**
   * Id of the trigger element. A consumer-set `id` on the trigger host is
   * adopted at registration and preserved; the generated
   * `for-tooltip-trigger-*` id is only assigned when the host has none.
   */
  readonly triggerId = signal(this.#generatedTriggerId);

  /** Generated id of the content element, wired to the trigger's `aria-describedby` while open. */
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

  /**
   * Registers the trigger host element. Adopts a pre-existing consumer-set
   * `id` as the trigger id so external references (anchors, `aria-labelledby`,
   * label `for`) keep resolving; falls back to the generated id otherwise.
   */
  registerTrigger(el: HTMLElement): void {
    adoptHostId(el, this.triggerId);
    this.#triggerEl.set(el);
  }

  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
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
