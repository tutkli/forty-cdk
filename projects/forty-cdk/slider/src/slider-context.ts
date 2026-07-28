import { inject, InjectionToken, type Signal } from '@angular/core';

import { type WritingDirection } from 'forty-cdk/core';

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
 * The reachable value range for one thumb: the slider's `[min, max]` narrowed
 * by the adjacent thumbs and the `minStepsBetweenThumbs` gap, with both ends
 * rounded to the step's decimal precision. `max` is never below `min` — an
 * over-constrained configuration (a gap wider than the room the neighbors
 * leave, or `min > max`) collapses the range to a single point rather than
 * inverting it, so it is always safe to emit as `aria-valuemin` /
 * `aria-valuemax`.
 */
export interface ForSliderThumbBounds {
  readonly min: number;
  readonly max: number;
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
  readonly stepMultiplier: Signal<number>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  /**
   * The slider's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Thumb, track, and range pieces read
   * this so a disabled slider (or fieldset) is inert and exposes `aria-disabled`.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly minStepsBetweenThumbs: Signal<number>;
  readonly inverted: Signal<boolean>;

  // state
  readonly value: Signal<readonly number[]>;
  /** Per-thumb position as fraction `[0, 1]`, already inverted-aware. */
  readonly fractions: Signal<readonly number[]>;
  /**
   * Per-thumb reachable range, index-aligned with `value()`. The single source
   * of truth for both the neighbor + `minStepsBetweenThumbs` clamp applied by
   * {@link ForSliderContext.setValueAt} and the `aria-valuemin` /
   * `aria-valuemax` each `[forSliderThumb]` reports.
   */
  readonly thumbBounds: Signal<readonly ForSliderThumbBounds[]>;
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
   * Bump a thumb by `step` (or by `step × stepMultiplier` when `large` is
   * true) in the requested direction, resolved against `orientation`, `dir`,
   * and `inverted`.
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

  // track el (registered by `ForSliderTrack`)
  setTrack(el: HTMLElement | null): void;
  trackElement(): HTMLElement | null;

  // form
  /**
   * Trailing-edge hook for value-changing interactions. Emits `(valueCommit)`
   * with the final value array if the running interaction has mutated the
   * value, then resets the internal flag. No-op otherwise. Pointer drags call
   * this on pointerup with no argument. Thumbs call it on keyup of a navigation
   * key, passing their own `thumbIndex` so only the thumb that armed the
   * pending commit can commit it (a keyup on a different thumb is a no-op).
   */
  commitInteraction(thumbIndex?: number): void;

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
