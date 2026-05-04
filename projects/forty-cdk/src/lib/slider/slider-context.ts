import { inject, InjectionToken, type Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

/**
 * One thumb registered with `ForSlider`. The handle exposes the host element
 * (so the root can focus it) and the live `index` signal so reordering or
 * adding/removing thumbs works without re-registration.
 */
export interface ForSliderThumbHandle {
  readonly host: HTMLElement;
  readonly index: Signal<number>;
}

/**
 * Coordination contract owned by `ForSlider`. Track and thumb pieces inject
 * this to read configuration, push value updates, and start drag flows.
 */
export interface ForSliderContext {
  // configuration (effective values — already defaulted)
  readonly minValue: Signal<number>;
  readonly maxValue: Signal<number>;
  readonly step: Signal<number>;
  readonly largeStep: Signal<number>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly minStepsBetweenThumbs: Signal<number>;
  readonly inverted: Signal<boolean>;

  // state
  readonly value: Signal<readonly number[]>;
  /** Per-thumb position as fraction `[0, 1]`, already inverted-aware. */
  readonly fractions: Signal<readonly number[]>;
  /** Range start fraction `[0, 1]` for `[forSliderRange]`. */
  readonly rangeStart: Signal<number>;
  /** Range end fraction `[0, 1]` for `[forSliderRange]`. */
  readonly rangeEnd: Signal<number>;

  // operations
  /**
   * Set the value for a specific thumb. Snaps to step, clamps to `[min, max]`,
   * and respects `minStepsBetweenThumbs` against neighbors. No-op while
   * `disabled` or `readonly`.
   */
  setValueAt(index: number, raw: number): void;
  /**
   * Bump a thumb by `step` (or `largeStep`) in the requested direction,
   * resolved against `orientation`, `dir`, and `inverted`.
   */
  bumpAt(index: number, key: SliderArrowKey, large: boolean): void;
  /** Set thumb to absolute `min` or `max` extreme (Home / End). */
  setExtreme(index: number, which: 'min' | 'max'): void;

  // pointer
  /**
   * Map a pointer's client coordinates to a value in `[min, max]`,
   * respecting orientation, direction, and inversion.
   */
  pointerToValue(clientX: number, clientY: number): number;
  /** Index of the thumb whose value is closest to `target`. */
  nearestThumbIndex(target: number): number;
  /**
   * Begin a drag for the given thumb. Attaches global pointermove / pointerup
   * listeners; the thumb's own `(pointerdown)` calls this directly, and the
   * track's calls it after picking the nearest thumb.
   */
  beginDrag(index: number, event: PointerEvent): void;

  // track el (registered by `ForSliderTrack`)
  setTrack(el: HTMLElement | null): void;
  trackElement(): HTMLElement | null;

  // form
  markTouched(): void;
  /**
   * Trailing-edge hook for value-changing interactions. Emits `(valueCommit)`
   * with the final value array if the running interaction has mutated the
   * value, then resets the internal flag. No-op otherwise. Pointer drags
   * call this on pointerup; thumbs call it on keyup of a navigation key.
   */
  commitInteraction(): void;

  // registry
  registerThumb(handle: ForSliderThumbHandle): void;
  unregisterThumb(handle: ForSliderThumbHandle): void;
}

export type SliderArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export const FOR_SLIDER_CONTEXT = new InjectionToken<ForSliderContext>('FOR_SLIDER_CONTEXT');

export function injectSliderContext(piece: string): ForSliderContext {
  const ctx = inject(FOR_SLIDER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/slider] ${piece} must be used inside a [forSlider] element.`);
  }
  return ctx;
}
