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
  /**
   * The registered trigger: measured to orient the grace polygon, and the only
   * element whose hover and focus keep the surface alive.
   */
  readonly trigger: () => HTMLElement | null;
  /** The registered content the grace polygon bridges toward. */
  readonly content: () => HTMLElement | null;
  /** Side the grace polygon assumes when no trigger is registered to measure. */
  readonly side: () => FloatingSide;
  /**
   * Whether a surface opened from inside the content is still open above it,
   * which keeps the surface alive like hover and focus do.
   */
  readonly nested: () => boolean;
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
  /** The content unmounted: clears its hover and focus and disarms the grace. */
  resetContent(): void;
  /**
   * The trigger on `el` unmounted: forgets its hover and focus, so the state
   * keeps no reference to the element.
   */
  releaseTrigger(el: HTMLElement): void;
  /**
   * A surface opened from inside the content closed: once the current task
   * settles (a return of focus into the content included), closes when nothing
   * else keeps the surface alive.
   */
  nestedSurfaceClosed(): void;
  /**
   * Closes unless the trigger or the content is hovered or focused, or a
   * surface opened from inside the content is still open.
   */
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
 * An element removed under the pointer never reports `pointerleave` or `blur`,
 * so the trigger's hover and focus count only while the element they were
 * observed on is still the registered trigger, `releaseTrigger` forgets that
 * element when it unmounts, and `resetContent` clears the content side when
 * its element unmounts.
 *
 * Internal core tier — exported from `forty-cdk/core-anchored` for the
 * library's own entry points, with no semver guarantee.
 */
export function createHoverSurfaceState(options: HoverSurfaceOptions): HoverSurfaceState {
  let hoveredTrigger: HTMLElement | null = null;
  let focusedTrigger: HTMLElement | null = null;
  let contentHovered = false;
  let contentFocused = false;
  let detachGrace: (() => void) | null = null;

  const isTrigger = (el: HTMLElement | null): boolean => el !== null && el === options.trigger();
  const triggerHovered = (): boolean => isTrigger(hoveredTrigger);
  const triggerFocused = (): boolean => isTrigger(focusedTrigger);

  function disarmGrace(): void {
    if (detachGrace) {
      detachGrace();
      detachGrace = null;
    }
  }

  function closeIfInactive(): void {
    if (
      triggerHovered() ||
      triggerFocused() ||
      contentHovered ||
      contentFocused ||
      options.nested()
    ) {
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
      { tracksPointer: isNonTouchPointer, exitsOutOfRange: true },
    );
  }

  return {
    triggerFocused,
    focused: () => triggerFocused() || contentFocused,
    enterTrigger: () => {
      hoveredTrigger = options.trigger();
      disarmGrace();
    },
    leaveTrigger: () => {
      hoveredTrigger = null;
    },
    focusTrigger: () => {
      focusedTrigger = options.trigger();
    },
    blurTrigger: () => {
      focusedTrigger = null;
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
    resetContent: () => {
      contentHovered = false;
      contentFocused = false;
      disarmGrace();
    },
    releaseTrigger: (el) => {
      if (hoveredTrigger === el) {
        hoveredTrigger = null;
      }
      if (focusedTrigger === el) {
        focusedTrigger = null;
      }
    },
    nestedSurfaceClosed: () => {
      queueMicrotask(closeIfInactive);
    },
    closeIfInactive,
    armGrace,
    disarmGrace,
  };
}
