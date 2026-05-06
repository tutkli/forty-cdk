import { afterNextRender, effect, ElementRef, inject, Signal } from '@angular/core';
import {
  autoUpdate,
  computePosition,
  type Middleware,
  type Padding,
  type ReferenceElement,
} from '@floating-ui/dom';

import { injectPortal } from '../portal/portal';

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
   * `--for-select-content-available-height` CSS variable.
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
      const viewportHeight = window.innerHeight;

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
 * "snaps over" the trigger when opened, mirroring macOS native `<select>` and
 * Radix's `Select.Content` `position: 'item-aligned'`.
 *
 * Owns:
 * 1. Optional portal — `appendChild` to `document.body` on first render,
 *    `remove()` on destroy.
 * 2. A reactive effect that runs `autoUpdate(reference, listbox, …)` while
 *    `open` is true. Inside, calls `computePosition` with the custom
 *    `itemAligned` middleware and writes the resolved `transform`,
 *    `data-position="item-aligned"`, anchor-width / anchor-height /
 *    available-height CSS vars.
 * 3. After the first position resolves, scrolls the target option into view
 *    via `scrollIntoView({ block: 'nearest' })` so the visual anchor stays
 *    correct when the listbox is taller than the viewport.
 *
 * `side`, `align`, `sideOffset`, `alignOffset`, `placement`, `flip`, `shift`,
 * and `arrow` are intentionally **not** part of this API — Radix's spec for
 * item-aligned mode treats them as no-ops.
 */
export function injectItemAlignedPositioner(config: ItemAlignedConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;

  if (config.portal !== false) {
    injectPortal();
  }

  afterNextRender(() => {
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
    });
  });

  effect((onCleanup) => {
    const isOpen = config.open();
    const reference = config.reference();
    const collisionPadding = paddingTop(config.collisionPadding?.(), 8);

    if (!isOpen || !reference) {
      return;
    }

    let initialScrollDone = false;

    const cleanup = autoUpdate(reference, el, () => {
      computePosition(reference, el, {
        strategy: 'fixed',
        // Placement is irrelevant — `itemAligned` overrides x/y outright —
        // but `computePosition` requires *some* placement. Pick a stable one
        // so middleware data stays predictable.
        placement: 'bottom-start',
        middleware: [
          itemAligned(
            () => config.selectedOption(),
            () => collisionPadding,
          ),
        ],
      }).then(({ x, y }) => {
        if (!config.open()) {
          return;
        }

        Object.assign(el.style, {
          transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
        });
        el.dataset['position'] = 'item-aligned';

        const triggerRect = reference.getBoundingClientRect();
        el.style.setProperty('--for-anchor-width', `${Math.round(triggerRect.width)}px`);
        el.style.setProperty('--for-anchor-height', `${Math.round(triggerRect.height)}px`);

        const availableHeight = Math.max(0, window.innerHeight - 2 * collisionPadding);
        el.style.setProperty(
          '--for-select-content-available-height',
          `${Math.round(availableHeight)}px`,
        );

        if (!initialScrollDone) {
          initialScrollDone = true;
          const target = config.selectedOption() ?? findFirstEnabledOption(el);
          // jsdom (test env) doesn't implement scrollIntoView — guard the
          // call so the helper stays usable in non-browser environments.
          target?.scrollIntoView?.({ block: 'nearest' });
        }
      });
    });

    onCleanup(() => cleanup());
  });
}
