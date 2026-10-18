import { type Signal } from '@angular/core';
import {
  type Middleware,
  type Padding,
  type Placement,
  type ReferenceElement,
} from '@floating-ui/dom';

import {
  type FloatingCustomProperties,
  injectFloatingCustomProperties,
} from './floating-custom-properties';
import { isFloatingRtl } from './floating-direction';
import { runPositioning } from './run-positioning';

export interface ItemAlignedConfig {
  /**
   * The anchor (typically a `<button>` trigger). Reactive — should emit
   * `null` until the anchor is available; positioning is skipped while
   * `null` or `open` is `false`.
   */
  readonly reference: Signal<ReferenceElement | null>;

  /**
   * Whether the listbox is currently visible. `autoUpdate` is started when
   * this becomes `true` and torn down when it goes back to `false`.
   */
  readonly open: Signal<boolean>;

  /**
   * The selected option element to anchor over the trigger. When `null`,
   * the algorithm falls back to the first enabled `[role="option"]` inside
   * the listbox. Read on each position run, so a selection change while open
   * does not reposition the listbox; it is anchored on the next open or the
   * next `autoUpdate` run.
   */
  readonly selectedOption: Signal<HTMLElement | null>;

  /**
   * Padding (px) the listbox keeps from the viewport edge. Default `8`.
   * Drives both the viewport clamp on every edge of the listbox and the
   * `--for-floating-available-height` CSS variable.
   */
  readonly collisionPadding?: Signal<number | Padding>;

  /**
   * Called once per open cycle, on the first resolved position, after the listbox has been
   * portaled and its CSS vars written. When set it replaces the positioner's own first-position
   * scroll of the anchored option, so the caller decides which option to reveal.
   */
  readonly onFirstPosition?: () => void;

  /**
   * When `true` (default), the floating element is moved to `document.body`
   * on first render and removed on destroy. Set to `false` when the caller
   * already invokes `injectPortal()` on its own.
   */
  readonly portal?: boolean;
}

interface ItemAlignedPadding {
  readonly top: number;
  readonly left: number;
  readonly right: number;
}

function paddingSide(
  padding: number | Padding | undefined,
  side: keyof ItemAlignedPadding,
  fallback: number,
): number {
  if (padding == null) {
    return fallback;
  }
  if (typeof padding === 'number') {
    return padding;
  }
  return padding[side] ?? fallback;
}

function findFirstEnabledOption(listbox: HTMLElement): HTMLElement | null {
  const options = listbox.querySelectorAll<HTMLElement>('[role="option"]');
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    if (opt.getAttribute('aria-disabled') === 'true' || opt.hasAttribute('disabled')) {
      continue;
    }
    return opt;
  }
  return null;
}

export interface ItemAlignedGeometry {
  /** Viewport-relative top edge of the anchor. */
  readonly triggerTop: number;

  readonly triggerHeight: number;

  /** Border-box height of the listbox, excluding any CSS transform. */
  readonly listboxHeight: number;

  /**
   * Distance from the listbox's top border edge to the vertical center of the
   * option to anchor over the trigger, or `null` when the listbox holds no
   * anchorable option — the listbox then aligns to the trigger's top edge.
   */
  readonly targetCenter: number | null;

  readonly viewportHeight: number;

  /** Distance the listbox keeps from the viewport's top and bottom edges. */
  readonly padding: number;
}

/**
 * Resolves the listbox's vertical offset so the target option's center lines up
 * with the trigger's center, clamped inside the viewport. A listbox taller than
 * the band the padding leaves cannot satisfy both edges and pins to the top.
 */
export function resolveItemAlignedY(geometry: ItemAlignedGeometry): number {
  const { triggerTop, triggerHeight, listboxHeight, targetCenter, viewportHeight, padding } =
    geometry;
  const minY = padding;
  const maxY = viewportHeight - listboxHeight - padding;

  if (targetCenter == null) {
    return Math.max(minY, Math.min(triggerTop, maxY));
  }

  const desiredY = triggerTop + triggerHeight / 2 - targetCenter;
  return maxY > minY ? Math.max(minY, Math.min(desiredY, maxY)) : minY;
}

export interface ItemAlignedInlineGeometry {
  readonly triggerLeft: number;
  readonly triggerWidth: number;
  readonly listboxWidth: number;
  readonly viewportWidth: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
  readonly rtl: boolean;
}

export function resolveItemAlignedX(geometry: ItemAlignedInlineGeometry): number {
  const { triggerLeft, triggerWidth, listboxWidth, viewportWidth, paddingLeft, paddingRight, rtl } =
    geometry;
  const minX = paddingLeft;
  const maxX = viewportWidth - listboxWidth - paddingRight;

  if (maxX < minX) {
    return rtl ? maxX : minX;
  }

  const desiredX = rtl ? triggerLeft + triggerWidth - listboxWidth : triggerLeft;
  return Math.max(minX, Math.min(desiredX, maxX));
}

function offsetTopWithinChain(el: HTMLElement): number {
  const view = el.ownerDocument.defaultView;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    const parent: Element | null = node.offsetParent;
    node = view && parent instanceof view.HTMLElement ? parent : null;
  }
  return top;
}

/**
 * Distance from `listbox`'s top border edge to `target`'s vertical center, read
 * from offset geometry so a CSS transform on either element cannot skew it.
 * Offset geometry is integer-rounded, so the result is accurate to about a
 * pixel.
 */
export function offsetCenterWithinListbox(target: HTMLElement, listbox: HTMLElement): number {
  return offsetTopWithinChain(target) + target.offsetHeight / 2 - offsetTopWithinChain(listbox);
}

/**
 * Custom floating-ui middleware. Computes raw `x`/`y` so the *target option's
 * vertical center* lines up with the *trigger's vertical center*, and the
 * listbox's inline-start edge lines up with the trigger's, mirrored under RTL.
 * Both axes are clamped inside the viewport with `padding`.
 *
 * Falls back to the first enabled option inside the listbox when no option
 * is selected — matches the macOS `<select>` behavior.
 */
function itemAligned(
  selectedOption: () => HTMLElement | null,
  padding: ItemAlignedPadding,
): Middleware {
  return {
    name: 'item-aligned',
    fn(state) {
      const reference = state.elements.reference;
      const floating = state.elements.floating;
      const triggerRect = reference.getBoundingClientRect();
      const target = selectedOption() ?? findFirstEnabledOption(floating);
      // Read the viewport height through the floating element's own
      // window so the middleware works in iframes / multiple-document
      // contexts and stays SSR-safe (the middleware itself only runs
      // inside a `computePosition` callback, which is browser-only).
      const viewportHeight = floating.ownerDocument.defaultView?.innerHeight ?? 0;

      const y = resolveItemAlignedY({
        triggerTop: triggerRect.top,
        triggerHeight: triggerRect.height,
        listboxHeight: floating.offsetHeight,
        targetCenter: target ? offsetCenterWithinListbox(target, floating) : null,
        viewportHeight,
        padding: padding.top,
      });

      const x = resolveItemAlignedX({
        triggerLeft: triggerRect.left,
        triggerWidth: triggerRect.width,
        listboxWidth: floating.offsetWidth,
        viewportWidth: floating.ownerDocument.documentElement.clientWidth,
        paddingLeft: padding.left,
        paddingRight: padding.right,
        rtl: isFloatingRtl(floating),
      });

      return { x, y };
    },
  };
}

/**
 * Item-aligned positioner for `[forSelectContent]` (the `position="item-aligned"`
 * mode). The listbox overlays the trigger so the *selected option*'s center
 * lines up with the trigger's center on the cross axis — visually the menu
 * "snaps over" the trigger when opened, mirroring macOS native `<select>`
 * dropdowns.
 *
 * Delegates the platform gate, portal, anti-flash baseline, `autoUpdate` loop,
 * `translate` write, `clip-path` drop, and symmetric cleanup to the shared
 * {@link runPositioning} scaffold, and supplies its own per-run body: the
 * custom `itemAligned` middleware plus the writes that follow each resolved
 * position — `data-position="item-aligned"`, the `--for-floating-anchor-width/-height`
 * and `--for-floating-available-height` CSS vars — and, on the first resolved position,
 * `scrollIntoView({ block: 'nearest' })` on the target option so the visual
 * anchor stays correct when the listbox is taller than the viewport, unless
 * `onFirstPosition` is supplied, which then owns that reveal.
 *
 * `--for-floating-available-height` is the same *concept* the anchored positioner
 * publishes (the maximum block-size the surface may occupy before it
 * collides), computed for this algorithm: the surface overlays the trigger
 * rather than sitting beside it, so the band is the full viewport minus
 * `collisionPadding` on both edges (`innerHeight - 2 * collisionPadding`)
 * rather than the anchor-relative space floating-ui's `size` middleware
 * reports. A consumer's `max-height: var(--for-floating-available-height)` therefore
 * works unchanged across `position="popper"` and `position="item-aligned"`.
 * `--for-floating-available-width` is **not** published here: item-aligned
 * aligns the listbox's inline-start edge with the trigger's and computes no
 * width budget.
 *
 * `side`, `align`, `sideOffset`, `alignOffset`, `placement`, `flip`, `shift`,
 * and `arrow` are intentionally **not** part of this API — item-aligned mode
 * treats them as no-ops.
 */
export function injectItemAlignedPositioner(config: ItemAlignedConfig): void {
  const vars = injectFloatingCustomProperties();
  runPositioning({
    reference: config.reference,
    open: config.open,
    portal: config.portal,
    onFirstPosition: config.onFirstPosition,
    computeAndApply: (el, reference) => {
      const paddingInput = config.collisionPadding?.();
      const padding: ItemAlignedPadding = {
        top: paddingSide(paddingInput, 'top', 8),
        left: paddingSide(paddingInput, 'left', 8),
        right: paddingSide(paddingInput, 'right', 8),
      };
      const collisionPadding = padding.top;

      let initialScrollDone = config.onFirstPosition !== undefined;

      return {
        // Placement is irrelevant — `itemAligned` overrides x/y outright —
        // but `computePosition` requires *some* placement. Pick a stable one
        // so middleware data stays predictable.
        placement: 'bottom-start' satisfies Placement,
        middleware: [itemAligned(() => config.selectedOption(), padding)],
        apply() {
          el.dataset['position'] = 'item-aligned';

          const triggerRect = reference.getBoundingClientRect();
          el.style.setProperty(vars.anchorWidth, `${Math.round(triggerRect.width)}px`);
          el.style.setProperty(vars.anchorHeight, `${Math.round(triggerRect.height)}px`);

          const innerHeight = el.ownerDocument.defaultView?.innerHeight ?? 0;
          const availableHeight = Math.max(0, innerHeight - 2 * collisionPadding);
          el.style.setProperty(vars.availableHeight, `${Math.round(availableHeight)}px`);

          if (!initialScrollDone) {
            initialScrollDone = true;
            const target = config.selectedOption() ?? findFirstEnabledOption(el);
            // jsdom (test env) doesn't implement scrollIntoView — guard the
            // call so the helper stays usable in non-browser environments.
            target?.scrollIntoView?.({ block: 'nearest' });
          }
        },
        reset() {
          resetItemAlignedStyles(el, vars);
        },
      };
    },
  });
}

/**
 * Strip the transient sizing vars, CSS custom properties, and `data-*`
 * attributes `injectItemAlignedPositioner` writes to the listbox — including
 * the `clip-path` hide baseline — while **retaining** the resolved `translate`.
 * Mirrors `resetFloatingStyles` in `floating.ts`: the surface is portaled
 * until `getAnimations().finished`, so during an `animate.leave` exit the host
 * keeps `position: fixed; left: 0; top: 0` and the retained `translate` stays
 * anchored over the trigger instead of flashing at the viewport origin. The
 * next mount re-arms the `clip-path` baseline in `afterNextRender` and
 * recomputes the position before painting, so the retained `translate` never
 * produces a stale-position flash.
 */
function resetItemAlignedStyles(el: HTMLElement, vars: FloatingCustomProperties): void {
  el.style.removeProperty('clip-path');
  el.style.removeProperty(vars.anchorWidth);
  el.style.removeProperty(vars.anchorHeight);
  el.style.removeProperty(vars.availableHeight);
  el.removeAttribute('data-position');
}
