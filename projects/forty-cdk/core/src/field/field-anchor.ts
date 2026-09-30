import { inject, InjectionToken, type Signal, signal } from '@angular/core';

/**
 * The positioning-anchor slot a `[forField]` offers the overlay controls inside
 * it. `[forFieldAnchor]` fills it; `[forSelect]`, `[forCombobox]`,
 * `[forDatePicker]` and `[forTimePicker]` position their panel against it when
 * they have no anchor of their own.
 */
export interface ForFieldAnchorContext {
  /** The element registered by `[forFieldAnchor]`, or `null`. */
  readonly anchor: Signal<HTMLElement | null>;
  /**
   * Register the field's positioning anchor. A field takes one anchor; a second
   * one still registered once the change-detection pass settles warns in dev
   * mode, and the most recently registered one is used.
   */
  registerAnchor(el: HTMLElement): void;
  /** Remove a previously registered anchor. A no-op for an element that never registered. */
  unregisterAnchor(el: HTMLElement): void;
}

/**
 * Injection token for the surrounding field's anchor slot. `[forField]`
 * provides it and `[forFieldBoundary]` leaves it in place, so an auxiliary
 * picker opted out of the field's control registration still aligns to the
 * field box. Resolves to `null` inside an overlay surface, whose controls are
 * positioned relative to that surface rather than to the field around it.
 */
export const FOR_FIELD_ANCHOR_CONTEXT = new InjectionToken<ForFieldAnchorContext | null>(
  'FOR_FIELD_ANCHOR_CONTEXT',
);

/**
 * The surrounding field's anchor element, or a signal that stays `null` when no
 * field is reachable. An overlay root reads it as the fallback between its own
 * anchor and its trigger or input.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function injectFieldAnchor(): Signal<HTMLElement | null> {
  return (
    inject(FOR_FIELD_ANCHOR_CONTEXT, { optional: true })?.anchor ??
    signal<HTMLElement | null>(null).asReadonly()
  );
}
