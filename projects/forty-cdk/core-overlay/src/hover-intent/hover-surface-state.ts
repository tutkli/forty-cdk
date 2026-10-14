import { isNonTouchPointer } from 'forty-cdk/core';

import type { FloatingSide } from '../floating/floating';
import {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
} from '../pointer-grace/pointer-grace';

/**
 * Inputs for {@link createHoverSurfaceState}.
 */
export interface HoverSurfaceOptions {
  /** The registered trigger, measured to orient the grace polygon. */
  readonly trigger: () => HTMLElement | null;
  /** The registered content the grace polygon bridges toward. */
  readonly content: () => HTMLElement | null;
  /** Side the grace polygon assumes when no trigger is registered to measure. */
  readonly side: () => FloatingSide;
  /** Closes the surface once no keep-alive source is active. */
  readonly close: () => void;
}

/**
 * Keep-alive bookkeeping of a hover-scheduled overlay, returned by
 * {@link createHoverSurfaceState}.
 */
export interface HoverSurfaceState {
  /** Whether the trigger holds focus. */
  triggerFocused(): boolean;
  /** Whether the trigger or the content holds focus. */
  focused(): boolean;
  /** The pointer entered the trigger: marks it hovered and disarms the grace. */
  enterTrigger(): void;
  /** The pointer left the trigger: clears its hover, leaving the close to the caller. */
  leaveTrigger(): void;
  /** The trigger received focus. */
  focusTrigger(): void;
  /** The trigger lost focus: closes when nothing else keeps the surface alive. */
  blurTrigger(): void;
  /** The pointer entered the content: marks it hovered and disarms the grace. */
  enterContent(): void;
  /** The pointer left the content: closes when nothing else keeps the surface alive. */
  leaveContent(): void;
  /** Focus entered the content. */
  focusContent(): void;
  /** Focus left the content: closes when nothing else keeps the surface alive. */
  blurContent(): void;
  /** The trigger unmounted: clears its hover and focus and disarms the grace. */
  resetTrigger(): void;
  /** The content unmounted: clears its hover and focus and disarms the grace. */
  resetContent(): void;
  /** Closes unless the trigger or the content is hovered or focused. */
  closeIfInactive(): void;
  /**
   * Arms a pointer-grace polygon from `cursor` toward the content, so the
   * pointer can cross the gap without closing. Leaving it disarms the grace and
   * closes when nothing else keeps the surface alive. Without registered
   * content it closes the same way at once.
   */
  armGrace(cursor: Point): void;
  /** Detaches an armed grace polygon. Safe when none is armed. */
  disarmGrace(): void;
}

/**
 * Shared keep-alive state for Tooltip and Hover-card: which side of the
 * overlay is hovered or focused, and the pointer-grace bridge between them.
 * Each `reset*` clears one side when its element unmounts, since an element
 * removed under the pointer never reports `pointerleave` or `blur`.
 *
 * Internal core tier — exported from `forty-cdk/core-overlay` for the
 * library's own entry points, with no semver guarantee.
 */
export function createHoverSurfaceState(options: HoverSurfaceOptions): HoverSurfaceState {
  let triggerHovered = false;
  let triggerFocused = false;
  let contentHovered = false;
  let contentFocused = false;
  let detachGrace: (() => void) | null = null;

  function disarmGrace(): void {
    if (detachGrace) {
      detachGrace();
      detachGrace = null;
    }
  }

  function closeIfInactive(): void {
    if (triggerHovered || triggerFocused || contentHovered || contentFocused) {
      return;
    }
    options.close();
  }

  function armGrace(cursor: Point): void {
    const content = options.content();
    if (!content) {
      closeIfInactive();
      return;
    }
    const rect = content.getBoundingClientRect();
    const trigger = options.trigger();
    const side = trigger ? resolveGraceSide(trigger.getBoundingClientRect(), rect) : options.side();
    const polygon = buildSubmenuGracePolygon(cursor, rect, side);
    disarmGrace();
    detachGrace = attachPointerGrace(
      content.ownerDocument,
      polygon,
      () => {
        disarmGrace();
        closeIfInactive();
      },
      { tracksPointer: isNonTouchPointer },
    );
  }

  return {
    triggerFocused: () => triggerFocused,
    focused: () => triggerFocused || contentFocused,
    enterTrigger: () => {
      triggerHovered = true;
      disarmGrace();
    },
    leaveTrigger: () => {
      triggerHovered = false;
    },
    focusTrigger: () => {
      triggerFocused = true;
    },
    blurTrigger: () => {
      triggerFocused = false;
      closeIfInactive();
    },
    enterContent: () => {
      contentHovered = true;
      disarmGrace();
    },
    leaveContent: () => {
      contentHovered = false;
      closeIfInactive();
    },
    focusContent: () => {
      contentFocused = true;
    },
    blurContent: () => {
      contentFocused = false;
      closeIfInactive();
    },
    resetTrigger: () => {
      triggerHovered = false;
      triggerFocused = false;
      disarmGrace();
    },
    resetContent: () => {
      contentHovered = false;
      contentFocused = false;
      disarmGrace();
    },
    closeIfInactive,
    armGrace,
    disarmGrace,
  };
}
