import { type Signal } from '@angular/core';
import {
  type Middleware,
  type Padding,
  type Placement,
  type ReferenceElement,
} from '@floating-ui/dom';

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
   * the listbox. Reactive — re-running `computePosition` if the selection
   * changes while open.
   */
  readonly selectedOption: Signal<HTMLElement | null>;

  /**
   * Padding (px) the listbox keeps from the viewport edge. Default `8`.
   * Drives both the viewport clamp on the listbox top/bottom and the
   * `--for-floating-available-height` CSS variable.
   */
  readonly collisionPadding?: Signal<number | Padding>;

  /**
   * When `true` (default), the floating element is moved to `document.body`
   * on first render and removed on destroy. Set to `false` when the caller
   * already invokes `injectPortal()` on its own.
   */
  readonly portal?: boolean;
}

function paddingTop(padding: number | Padding | undefined, fallback: number): number {
  if (padding == null) {
    return fallback;
  }
  if (typeof padding === 'number') {
    return padding;
  }
  return padding.top ?? fallback;
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

/**
 * Custom floating-ui middleware. Computes raw `x`/`y` so the *target option's
 * vertical center* lines up with the *trigger's vertical center*, then clamps
 * the listbox inside the viewport with `padding`. Cross-axis: listbox left
 * edge aligned to the trigger left edge.
 *
 * Falls back to the first enabled option inside the listbox when no option
 * is selected — matches the macOS `<select>` behavior.
 */
function itemAligned(
  selectedOption: () => HTMLElement | null,
  paddingFn: () => number,
): Middleware {
  return {
    name: 'item-aligned',
    fn(state) {
      const reference = state.elements.reference;
      const floating = state.elements.floating;
      const triggerRect = reference.getBoundingClientRect();
      const listboxRect = floating.getBoundingClientRect();
      const target = selectedOption() ?? findFirstEnabledOption(floating);
      const padding = paddingFn();
      // Read the viewport height through the floating element's own
      // window so the middleware works in iframes / multiple-document
      // contexts and stays SSR-safe (the middleware itself only runs
      // inside a `computePosition` callback, which is browser-only).
      const viewportHeight = floating.ownerDocument.defaultView?.innerHeight ?? 0;

      let y: number;
      if (target) {
        const optRect = target.getBoundingClientRect();
        const targetCenterRelToListbox = optRect.top - listboxRect.top + optRect.height / 2;
        const desiredY = triggerRect.top + triggerRect.height / 2 - targetCenterRelToListbox;
        const minY = padding;
        const maxY = viewportHeight - listboxRect.height - padding;
        y = maxY > minY ? Math.max(minY, Math.min(desiredY, maxY)) : minY;
      } else {
        y = Math.max(
          padding,
          Math.min(triggerRect.top, viewportHeight - listboxRect.height - padding),
        );
      }

      return { x: triggerRect.left, y };
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
 * anchor stays correct when the listbox is taller than the viewport.
 *
 * `--for-floating-available-height` is the same *concept* the anchored positioner
 * publishes (the maximum block-size the surface may occupy before it
 * collides), computed for this algorithm: the surface overlays the trigger
 * rather than sitting beside it, so the band is the full viewport minus
 * `collisionPadding` on both edges (`innerHeight - 2 * collisionPadding`)
 * rather than the anchor-relative space floating-ui's `size` middleware
 * reports. A consumer's `max-height: var(--for-floating-available-height)` therefore
 * works unchanged across `position="popper"` and `position="item-aligned"`.
 * `--for-floating-available-width` is deliberately **not** published here: item-aligned
 * pins the cross axis to the trigger's left edge and computes no width budget.
 *
 * `side`, `align`, `sideOffset`, `alignOffset`, `placement`, `flip`, `shift`,
 * and `arrow` are intentionally **not** part of this API — item-aligned mode
 * treats them as no-ops.
 */
export function injectItemAlignedPositioner(config: ItemAlignedConfig): void {
  runPositioning({
    reference: config.reference,
    open: config.open,
    portal: config.portal,
    computeAndApply: (el, reference) => {
      const collisionPadding = paddingTop(config.collisionPadding?.(), 8);

      let initialScrollDone = false;

      return {
        // Placement is irrelevant — `itemAligned` overrides x/y outright —
        // but `computePosition` requires *some* placement. Pick a stable one
        // so middleware data stays predictable.
        placement: 'bottom-start' satisfies Placement,
        middleware: [
          itemAligned(
            () => config.selectedOption(),
            () => collisionPadding,
          ),
        ],
        apply() {
          el.dataset['position'] = 'item-aligned';

          const triggerRect = reference.getBoundingClientRect();
          el.style.setProperty('--for-floating-anchor-width', `${Math.round(triggerRect.width)}px`);
          el.style.setProperty(
            '--for-floating-anchor-height',
            `${Math.round(triggerRect.height)}px`,
          );

          const innerHeight = el.ownerDocument.defaultView?.innerHeight ?? 0;
          const availableHeight = Math.max(0, innerHeight - 2 * collisionPadding);
          el.style.setProperty(
            '--for-floating-available-height',
            `${Math.round(availableHeight)}px`,
          );

          if (!initialScrollDone) {
            initialScrollDone = true;
            const target = config.selectedOption() ?? findFirstEnabledOption(el);
            // jsdom (test env) doesn't implement scrollIntoView — guard the
            // call so the helper stays usable in non-browser environments.
            target?.scrollIntoView?.({ block: 'nearest' });
          }
        },
        reset() {
          resetItemAlignedStyles(el);
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
function resetItemAlignedStyles(el: HTMLElement): void {
  el.style.removeProperty('clip-path');
  el.style.removeProperty('--for-floating-anchor-width');
  el.style.removeProperty('--for-floating-anchor-height');
  el.style.removeProperty('--for-floating-available-height');
  el.removeAttribute('data-position');
}
