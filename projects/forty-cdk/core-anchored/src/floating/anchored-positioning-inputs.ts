import type { Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingConfig, FloatingSide } from './floating';

/**
 * Single source of truth for the floating-ui positioning defaults shared by
 * every trigger-anchored overlay root. It is read once, by the two bases the
 * roots inherit their positioning block from
 * (`AnchoredOverlayPositioningBase` / `AnchoredFormValueControlBase`), so no
 * root spells a non-seed default itself.
 *
 * Only `side` / `align` / `sideOffset` / `collisionPadding` are seeded from
 * each root's own defaults provider (`provideForPopoverDefaults`,
 * `provideForSelectDefaults`, …) so a scope override flows through — those are
 * the placement values a design system tunes, and they legitimately vary per
 * root. Everything below is identical for every anchored overlay in the
 * library, which is why `arrowPadding` is not among them: only the three roots
 * shipping an arrow piece declare it, each seeded from its own defaults
 * provider.
 */
export const ANCHORED_POSITIONING_DEFAULTS = {
  /** Default gap (px) along the cross axis (parallel to `side`). */
  alignOffset: 0,
  /** `flip` / `shift` keep the surface inside the viewport by default. */
  avoidCollisions: true,
  /** Default stickiness behaviour for `shift`. */
  sticky: 'partial' as 'partial' | 'always' | false,
  /** `data-detached=""` is not reflected by default. */
  hideWhenDetached: false,
  /** Content is clipped until floating-ui resolves its first position by default. */
  clipUntilPositioned: true,
} as const;

/**
 * The resolved floating-ui positioning surface every trigger-anchored overlay
 * root publishes on its context. `ForPopoverContext`, `ForTooltipContext`, and
 * `ForHoverCardContext` all `extends` this so the 12-member positioning half of
 * each context interface is single-sourced rather than copied verbatim.
 *
 * Each member is the *effective* value — the per-instance input merged with the
 * scope default — so a content directive forwards it straight into
 * `injectOverlayShell` via `toFloatingPositioner` without re-resolving defaults.
 *
 * `open` is included because the floating positioner gates `autoUpdate` on it;
 * it is published by every root's open `model()` (a `ModelSignal` is a
 * `Signal`), so a single `extends` covers the whole positioner surface.
 */
export interface AnchoredPositioningContext {
  readonly open: Signal<boolean>;
  readonly side: Signal<FloatingSide>;
  readonly align: Signal<FloatingAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly arrow: Signal<HTMLElement | null>;
}

/**
 * Builds the `injectOverlayShell` floating-positioner block from an
 * `AnchoredPositioningContext` and the element the overlay anchors against.
 * Each of the three content directives (`ForPopoverContent`,
 * `ForTooltipContent`, `ForHoverCardContent`) built this 13-field block
 * verbatim; the only difference is the `reference` source — popover anchors to
 * its registered `[forPopoverAnchor]` (falling back to the trigger), tooltip
 * and hover-card anchor directly to the trigger — so the caller passes it in.
 */
export function toFloatingPositioner(
  ctx: AnchoredPositioningContext,
  reference: Signal<ReferenceElement | null>,
): { kind: 'floating' } & FloatingConfig {
  return {
    kind: 'floating',
    reference,
    open: ctx.open,
    side: ctx.side,
    align: ctx.align,
    sideOffset: ctx.sideOffset,
    alignOffset: ctx.alignOffset,
    avoidCollisions: ctx.avoidCollisions,
    collisionPadding: ctx.collisionPadding,
    arrowPadding: ctx.arrowPadding,
    sticky: ctx.sticky,
    hideWhenDetached: ctx.hideWhenDetached,
    clipUntilPositioned: ctx.clipUntilPositioned,
    arrow: ctx.arrow,
  };
}
