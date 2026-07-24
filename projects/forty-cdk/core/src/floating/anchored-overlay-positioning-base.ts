import { booleanAttribute, computed, Directive, input, numberAttribute } from '@angular/core';

import { ANCHORED_POSITIONING_DEFAULTS } from './anchored-positioning-inputs';
import type { FloatingAlign, FloatingSide } from './floating';

/**
 * The four positioning seeds a trigger-anchored overlay root resolves from its
 * own scoped defaults provider (`provideForPopoverDefaults` /
 * `provideForTooltipDefaults` / `provideForHoverCardDefaults`), rather than
 * from the shared {@link ANCHORED_POSITIONING_DEFAULTS} constant. Each root's
 * `ForXDefaults` interface `extends` this so the shared seed contract stays
 * typed identically across the three roots, and every concrete
 * {@link AnchoredOverlayPositioningBase} subclass supplies an instance of it
 * through its `positioningDefaults` accessor.
 */
export interface AnchoredPositioningSeedDefaults {
  /** Side the overlay is anchored to when the `side` input is unset. */
  side: FloatingSide;
  /** Alignment along the chosen `side` when the `align` input is unset. */
  align: FloatingAlign;
  /** Gap (px) between trigger and content along the main axis when the `sideOffset` input is unset. */
  sideOffset: number;
  /** Padding (px) applied uniformly to `flip` / `shift` / `size` when the `collisionPadding` input is unset. */
  collisionPadding: number;
}

/**
 * Abstract base for the three trigger-anchored overlay roots — `[forPopover]`,
 * `[forTooltip]`, and `[forHoverCard]`. It single-sources the ten shared
 * floating-ui positioning inputs and the four effective computeds those roots
 * declared verbatim before, so the declarations live in one place instead of
 * being copied per root.
 *
 * The six non-seed inputs (`alignOffset` / `avoidCollisions` / `arrowPadding` /
 * `sticky` / `hideWhenDetached` / `clipUntilPositioned`) default from the shared
 * {@link ANCHORED_POSITIONING_DEFAULTS} constant. The four seed computeds
 * (`side` / `align` / `sideOffset` / `collisionPadding`) fall back to the
 * subclass's own scoped defaults, read through the abstract
 * {@link positioningDefaults} accessor. The fallback is read lazily inside each
 * `computed()` factory — which runs only on first evaluation, after the
 * subclass field initializer has assigned `positioningDefaults` — so the base
 * never touches the still-uninitialized subclass field during construction.
 *
 * Implemented as an `@Directive()`-decorated abstract class because Angular
 * recognises signal inputs only when `input()` calls appear directly in a
 * class-field initializer (NG8110); a factory returning the bundle would not be
 * detected. Inheritance is the supported mechanism for sharing initializer-API
 * declarations across directives.
 */
@Directive()
export abstract class AnchoredOverlayPositioningBase {
  /**
   * The four positioning seeds this root resolves from its own scoped defaults
   * provider. Concrete roots implement it with
   * `protected readonly positioningDefaults = inject(FOR_X_DEFAULTS)`.
   */
  protected abstract readonly positioningDefaults: AnchoredPositioningSeedDefaults;

  /**
   * Per-instance override for the side the overlay is anchored to. Pair with
   * `align` for the full positioning API. When `undefined` (default), falls
   * back to the scope default. Aliased to `side`; consumers bind `[side]="..."`
   * and read the effective value via the public {@link side} computed.
   */
  readonly _sideInput = input<FloatingSide | undefined>(undefined, { alias: 'side' });

  /** Effective anchor side: the `side` input when set, else the scope default. */
  readonly side = computed<FloatingSide>(() => this._sideInput() ?? this.positioningDefaults.side);

  /**
   * Per-instance override for the alignment along the chosen `side`. When
   * `undefined` (default), falls back to the scope default. Aliased to `align`;
   * consumers bind `[align]="..."` and read the effective value via the public
   * {@link align} computed.
   */
  readonly _alignInput = input<FloatingAlign | undefined>(undefined, { alias: 'align' });

  /** Effective alignment: the `align` input when set, else the scope default. */
  readonly align = computed<FloatingAlign>(
    () => this._alignInput() ?? this.positioningDefaults.align,
  );

  /**
   * Per-instance override for the gap (px) between trigger and content along
   * the main axis. When `undefined` (default), falls back to the scope default.
   * Aliased to `sideOffset`; consumers bind `[sideOffset]="..."` and read the
   * effective value via the public {@link sideOffset} computed.
   */
  readonly _sideOffsetInput = input(undefined, {
    alias: 'sideOffset',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective main-axis gap (px): the `sideOffset` input when set, else the scope default. */
  readonly sideOffset = computed<number>(
    () => this._sideOffsetInput() ?? this.positioningDefaults.sideOffset,
  );

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(ANCHORED_POSITIONING_DEFAULTS.alignOffset, {
    transform: numberAttribute,
  });

  /**
   * When `true` (default), `flip` and `shift` keep the overlay inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(ANCHORED_POSITIONING_DEFAULTS.avoidCollisions, {
    transform: booleanAttribute,
  });

  /**
   * Per-instance override for the padding (px) applied uniformly to the `flip`,
   * `shift`, and `size` middlewares. When `undefined` (default), falls back to
   * the scope default. Aliased to `collisionPadding`; consumers bind
   * `[collisionPadding]="..."` and read the effective value via the public
   * {@link collisionPadding} computed.
   */
  readonly _collisionPaddingInput = input(undefined, {
    alias: 'collisionPadding',
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Effective collision padding (px): the `collisionPadding` input when set, else the scope default. */
  readonly collisionPadding = computed<number>(
    () => this._collisionPaddingInput() ?? this.positioningDefaults.collisionPadding,
  );

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(ANCHORED_POSITIONING_DEFAULTS.arrowPadding, {
    transform: numberAttribute,
  });

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default) lets the overlay
   * shift to stay visible. `'always'` keeps the requested placement even
   * off-screen.
   */
  readonly sticky = input<'partial' | 'always' | false>(ANCHORED_POSITIONING_DEFAULTS.sticky);

  /**
   * When `true`, sets `data-detached=""` while the trigger has scrolled off all
   * clipping ancestors.
   */
  readonly hideWhenDetached = input(ANCHORED_POSITIONING_DEFAULTS.hideWhenDetached, {
    transform: booleanAttribute,
  });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(ANCHORED_POSITIONING_DEFAULTS.clipUntilPositioned, {
    transform: booleanAttribute,
  });
}
