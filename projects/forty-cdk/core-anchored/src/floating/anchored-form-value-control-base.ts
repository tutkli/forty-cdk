import { booleanAttribute, computed, Directive, input, numberAttribute } from '@angular/core';

import { FormUiControlBase } from 'forty-cdk/core';
import { ANCHORED_POSITIONING_DEFAULTS } from './anchored-positioning-inputs';
import type {
  AnchoredPositioningOverride,
  AnchoredPositioningSeedDefaults,
} from './anchored-overlay-positioning-base';
import type { FloatingAlign, FloatingSide } from './floating';

/**
 * `AnchoredOverlayPositioningBase` for the anchored roots that are also form
 * values — `[forSelect]`, `[forCombobox]`, `[forTimePicker]`, and both
 * date-picker roots through `DatePickerBase`. They must extend
 * `FormUiControlBase` for the Signal Forms contract, and TypeScript has single
 * inheritance, so the positioning block cannot reach them by extending the
 * other base as the remaining eight roots do.
 *
 * This class is therefore the **second and last** declaration site of that
 * block, and it is a verbatim copy on purpose:
 * `anchored-positioning-inputs.spec.ts` reads both files and fails when the two
 * regions stop matching character-for-character, so a change to one is a change
 * to both. Everything the block means is documented on
 * {@link AnchoredOverlayPositioningBase}; do not restate it here, and do not add
 * a member to one base without adding it to the other.
 */
@Directive()
export abstract class AnchoredFormValueControlBase extends FormUiControlBase {
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
