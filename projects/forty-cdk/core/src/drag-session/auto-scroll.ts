import { type DragRect } from './drag-geometry';

/** A 2-D scroll velocity vector produced by `computeScrollVelocity`. */
export interface AutoScrollVelocity {
  readonly x: number;
  readonly y: number;
}

function axisVelocity(
  pos: number,
  start: number,
  end: number,
  edgeSize: number,
  maxSpeed: number,
): number {
  if (edgeSize <= 0 || pos < start || pos > end) {
    return 0;
  }
  const distStart = pos - start;
  if (distStart <= edgeSize) {
    return -maxSpeed * (1 - distStart / edgeSize);
  }
  const distEnd = end - pos;
  if (distEnd <= edgeSize) {
    return maxSpeed * (1 - distEnd / edgeSize);
  }
  return 0;
}

/**
 * Computes a 2-D scroll velocity from the pointer position relative to a
 * scroll container's bounding rect. Each axis is computed independently:
 * negative values scroll toward the start edge, positive toward the end.
 * Velocity scales linearly with proximity; at the edge = ±`maxSpeed`, at
 * `edgeSize` pixels away = 0.
 */
export function computeScrollVelocity(
  rect: DragRect,
  point: { readonly x: number; readonly y: number },
  edgeSize: number,
  maxSpeed: number,
): AutoScrollVelocity {
  return {
    x: axisVelocity(point.x, rect.left, rect.right, edgeSize, maxSpeed),
    y: axisVelocity(point.y, rect.top, rect.bottom, edgeSize, maxSpeed),
  };
}

function isScrollable(el: HTMLElement, win: Window): boolean {
  const style = win.getComputedStyle(el);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;
  const scrollsY =
    (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
  const scrollsX =
    (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
  return scrollsY || scrollsX;
}

/**
 * Walks up the DOM from `start` (inclusive) looking for the nearest scrollable
 * ancestor, stopping before `documentElement` and `body`. Returns the first
 * scrollable element, or `null` if none is found (the caller should fall back
 * to the viewport).
 */
export function findScrollContainer(start: HTMLElement | null, win: Window): HTMLElement | null {
  let el = start;
  while (el !== null && el !== win.document.documentElement && el !== win.document.body) {
    if (isScrollable(el, win)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** An active auto-scroll controller returned by `createAutoScroller`. */
export interface AutoScroller {
  /** Arms or disarms the rAF loop for the given pointer position. */
  update(point: { x: number; y: number }): void;
  /** Cancels the loop and clears cached state. Idempotent. */
  stop(): void;
}

/** Configuration passed to `createAutoScroller`. */
export interface AutoScrollerConfig {
  /** The list host element; used to find the nearest scrollable container. */
  readonly host: HTMLElement;
  /** The browser `Window`, or `null` in SSR / test environments without a DOM. */
  readonly win: Window | null;
  /** Pixel distance from the scroll edge that arms auto-scroll. */
  readonly edgeSize: number;
  /** Maximum scroll delta (px) applied per animation frame. */
  readonly maxSpeed: number;
  /** Called after each frame that actually scrolls, so callers can re-resolve the drop target. */
  readonly onFrame: () => void;
}

interface ScrollTarget {
  rect(): DragRect;
  scrollBy(dx: number, dy: number): void;
}

function elementTarget(el: HTMLElement): ScrollTarget {
  return {
    rect(): DragRect {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    },
    scrollBy(dx: number, dy: number): void {
      el.scrollLeft += dx;
      el.scrollTop += dy;
    },
  };
}

function viewportTarget(win: Window): ScrollTarget {
  return {
    rect(): DragRect {
      return { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
    },
    scrollBy(dx: number, dy: number): void {
      win.scrollBy(dx, dy);
    },
  };
}

/**
 * Creates an auto-scroller that drives a `requestAnimationFrame` loop while a
 * pointer drag is near the edge of the nearest scrollable container (or the
 * viewport). Deltas are applied instantaneously per frame — no CSS smooth-scroll
 * easing — which is the `prefers-reduced-motion`-safe approach: scrolling is
 * functional, not decorative, so no reduced-motion branch is needed.
 *
 * Returns a no-op controller when `config.win` is falsy or lacks
 * `requestAnimationFrame` (SSR / environments without a window).
 */
export function createAutoScroller(config: AutoScrollerConfig): AutoScroller {
  const maybeWin = config.win;
  if (!maybeWin || typeof maybeWin.requestAnimationFrame !== 'function') {
    return { update() {}, stop() {} };
  }

  const win: Window = maybeWin;

  let target: ScrollTarget | null = null;
  let point: { x: number; y: number } | null = null;
  let rafId: number | null = null;

  function resolveTarget(): ScrollTarget {
    const el = findScrollContainer(config.host, win);
    return el ? elementTarget(el) : viewportTarget(win);
  }

  function tick(): void {
    rafId = null;
    if (point === null || target === null) {
      return;
    }
    const v = computeScrollVelocity(target.rect(), point, config.edgeSize, config.maxSpeed);
    if (v.x === 0 && v.y === 0) {
      target = null;
      return;
    }
    target.scrollBy(v.x, v.y);
    config.onFrame();
    rafId = win.requestAnimationFrame(tick);
  }

  return {
    update(next: { x: number; y: number }): void {
      point = next;
      if (target === null) {
        target = resolveTarget();
      }
      const v = computeScrollVelocity(target.rect(), point, config.edgeSize, config.maxSpeed);
      if (v.x === 0 && v.y === 0) {
        if (rafId !== null) {
          win.cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (rafId === null) {
        rafId = win.requestAnimationFrame(tick);
      }
    },
    stop(): void {
      if (rafId !== null) {
        win.cancelAnimationFrame(rafId);
        rafId = null;
      }
      target = null;
      point = null;
    },
  };
}
