import { booleanAttribute, computed, Directive, input, numberAttribute } from '@angular/core';

import { ANCHORED_POSITIONING_DEFAULTS } from './anchored-positioning-inputs';
import type { FloatingAlign, FloatingSide } from './floating';

/**
 * The four positioning seeds a trigger-anchored overlay root resolves from its
 * own scoped defaults provider (`provideForPopoverDefaults`,
 * `provideForSelectDefaults`, …), rather than from the shared
 * {@link ANCHORED_POSITIONING_DEFAULTS} constant. A root's `ForXDefaults`
 * interface `extends` this whenever all four keys are plain values, so the
 * shared seed contract stays typed identically across roots, and every concrete
 * {@link AnchoredOverlayPositioningBase} subclass supplies an instance of it
 * through its `positioningDefaults` accessor.
 *
 * A root whose library fallback for one seed is *derived* rather than fixed —
 * Combobox's writing-direction `align`, MenuSub's writing-direction `side` —
 * declares that key nullable on its own defaults interface and resolves it
 * inside `positioningDefaults`, so what the base reads is always a settled
 * value.
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
 * Per-open override of the four **placement** values, resolved ahead of the
 * root's own inputs. It exists for the menu roots, where one surface is shared
 * by heterogeneous openers and the opener that fired legitimately decides the
 * placement (`MenuOpenerPositioning` is the shape flowing through
 * `[menuPositioning]`); every other root inherits the base's `null` and
 * resolves its inputs directly.
 *
 * Only the four placement values are overridable. The rest of the surface
 * (`avoidCollisions`, `collisionPadding`, `sticky`, …) is collision / viewport
 * policy for the overlay rather than a property of what opened it.
 */
export interface AnchoredPositioningOverride {
  /** Side the overlay is anchored to for this open. */
  readonly side?: FloatingSide;
  /** Alignment along the chosen `side` for this open. */
  readonly align?: FloatingAlign;
  /** Gap (px) along the main axis for this open. */
  readonly sideOffset?: number;
  /** Gap (px) along the cross axis for this open. */
  readonly alignOffset?: number;
}

/**
 * Abstract base for the trigger-anchored overlay roots. It single-sources the
 * ten shared floating-ui positioning inputs and the five effective computeds
 * over them, so the declarations live in one place instead of being copied per
 * root.
 *
 * Each of the four placement values resolves in the same three steps — the
 * per-open {@link positioningOverride}, then the root's own input, then the
 * scope default read through {@link positioningDefaults}. The six non-placement
 * inputs (`avoidCollisions` / `arrowPadding` / `sticky` / `hideWhenDetached` /
 * `clipUntilPositioned`, plus `alignOffset`'s own library fallback) default from
 * the shared {@link ANCHORED_POSITIONING_DEFAULTS} constant. The fallback is
 * read lazily inside each `computed()` factory — which runs only on first
 * evaluation, after the subclass field initializer has assigned
 * `positioningDefaults` — so the base never touches the still-uninitialized
 * subclass field during construction.
 *
 * Implemented as an `@Directive()`-decorated abstract class because Angular
 * recognises signal inputs only when `input()` calls appear directly in a
 * class-field initializer (NG8110); a factory returning the bundle would not be
 * detected. Inheritance is the supported mechanism for sharing initializer-API
 * declarations across directives — and because TypeScript has single
 * inheritance, the five roots that must also extend `FormUiControlBase` reach
 * the identical block through `AnchoredFormValueControlBase` instead. The two
 * declarations are pinned character-for-character by
 * `anchored-positioning-inputs.spec.ts`.
 */
@Directive()
export abstract class AnchoredOverlayPositioningBase {
  /**
   * The four positioning seeds this root resolves from its own scoped defaults
   * provider. Concrete roots implement it with
   * `protected readonly positioningDefaults = inject(FOR_X_DEFAULTS)`, or with
   * a getter over a `computed` when one seed is derived (writing direction).
   */
  protected abstract readonly positioningDefaults: AnchoredPositioningSeedDefaults;

  /**
   * Placement override for the current open, resolved ahead of this root's own
   * inputs. `null` (the default) leaves the inputs in charge; the menu roots
   * override it with the active opener's `[menuPositioning]`.
   */
  protected positioningOverride(): AnchoredPositioningOverride | null {
    return null;
  }

  /**
   * Per-instance override for the side the overlay is anchored to. Pair with
   * `align` for the full positioning API. When `undefined` (default), falls
   * back to the scope default. Aliased to `side`; consumers bind `[side]="..."`
   * and read the effective value via the public {@link side} computed.
   */
  readonly _sideInput = input<FloatingSide | undefined>(undefined, { alias: 'side' });

  /** Effective anchor side: the per-open override, else the `side` input, else the scope default. */
  readonly side = computed<FloatingSide>(
    () => this.positioningOverride()?.side ?? this._sideInput() ?? this.positioningDefaults.side,
  );

  /**
   * Per-instance override for the alignment along the chosen `side`. When
   * `undefined` (default), falls back to the scope default. Aliased to `align`;
   * consumers bind `[align]="..."` and read the effective value via the public
   * {@link align} computed.
   */
  readonly _alignInput = input<FloatingAlign | undefined>(undefined, { alias: 'align' });

  /** Effective alignment: the per-open override, else the `align` input, else the scope default. */
  readonly align = computed<FloatingAlign>(
    () => this.positioningOverride()?.align ?? this._alignInput() ?? this.positioningDefaults.align,
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

  /** Effective main-axis gap (px): the per-open override, else the input, else the scope default. */
  readonly sideOffset = computed<number>(
    () =>
      this.positioningOverride()?.sideOffset ??
      this._sideOffsetInput() ??
      this.positioningDefaults.sideOffset,
  );

  /**
   * Per-instance gap (px) along the cross axis (parallel to `side`). Default
   * `0`. Aliased to `alignOffset`; consumers bind `[alignOffset]="..."` and read
   * the effective value via the public {@link alignOffset} computed.
   */
  readonly _alignOffsetInput = input(ANCHORED_POSITIONING_DEFAULTS.alignOffset, {
    alias: 'alignOffset',
    transform: numberAttribute,
  });

  /** Effective cross-axis gap (px): the per-open override, else the `alignOffset` input. */
  readonly alignOffset = computed<number>(
    () => this.positioningOverride()?.alignOffset ?? this._alignOffsetInput(),
  );

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
