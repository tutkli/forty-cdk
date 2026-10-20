import { composedParentElement, type DragRect } from 'forty-cdk/core';

/** A 2-D scroll velocity vector produced by `computeScrollVelocity`. */
export interface AutoScrollVelocity {
  readonly x: number;
  readonly y: number;
}

const NO_VELOCITY: AutoScrollVelocity = { x: 0, y: 0 };

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
 * Walks up the composed tree from `start` (inclusive), stopping before
 * `documentElement` and `body`, and returns every scrollable ancestor from the
 * innermost outward. An empty result leaves the viewport as the only target.
 */
function findScrollContainers(start: HTMLElement | null, win: Window): HTMLElement[] {
  const containers: HTMLElement[] = [];
  let el = start;
  while (el !== null && el !== win.document.documentElement && el !== win.document.body) {
    if (isScrollable(el, win)) {
      containers.push(el);
    }
    el = composedParentElement(el);
  }
  return containers;
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
  /** The list host element; used as the fallback start for the scrollable-container search. */
  readonly host: HTMLElement;
  /** The browser `Window`, or `null` in SSR / test environments without a DOM. */
  readonly win: Window | null;
  /** Pixel distance from the scroll edge that arms auto-scroll. */
  readonly edgeSize: number;
  /** Maximum scroll delta (px) applied per animation frame. */
  readonly maxSpeed: number;
  /** Called after each frame that actually scrolls, so callers can re-resolve the drop target. */
  readonly onFrame: () => void;
  /**
   * Optional resolver for the element the scrollable-container search should start from, given the
   * current pointer position. Returns the element under the pointer (or `null` to fall back to
   * `host`). Supplied by callers that drag across connected lists so auto-scroll follows the
   * container the pointer is actually over — not always the origin list. The search is re-run on
   * every `update`, so a pointer crossing from one list into another scrolls the destination
   * container.
   */
  readonly resolveScrollHost?: (point: { x: number; y: number }) => HTMLElement | null;
}

interface ScrollTarget {
  velocity(point: { x: number; y: number }, edgeSize: number, maxSpeed: number): AutoScrollVelocity;
  scrollBy(dx: number, dy: number): void;
}

function towardRoom(delta: number, offset: number, max: number): number {
  if (delta < 0) {
    return offset >= 1 ? delta : 0;
  }
  return offset <= max - 1 ? delta : 0;
}

function elementTarget(el: HTMLElement, win: Window): ScrollTarget {
  return {
    velocity(point, edgeSize, maxSpeed): AutoScrollVelocity {
      const r = el.getBoundingClientRect();
      if (point.x < r.left || point.x > r.right || point.y < r.top || point.y > r.bottom) {
        return NO_VELOCITY;
      }
      const v = computeScrollVelocity(r, point, edgeSize, maxSpeed);
      const maxX = el.scrollWidth - el.clientWidth;
      const offsetX =
        v.x !== 0 && win.getComputedStyle(el).direction === 'rtl'
          ? el.scrollLeft + maxX
          : el.scrollLeft;
      return {
        x: towardRoom(v.x, offsetX, maxX),
        y: towardRoom(v.y, el.scrollTop, el.scrollHeight - el.clientHeight),
      };
    },
    scrollBy(dx: number, dy: number): void {
      el.scrollLeft += dx;
      el.scrollTop += dy;
    },
  };
}

function viewportTarget(win: Window): ScrollTarget {
  return {
    velocity(point, edgeSize, maxSpeed): AutoScrollVelocity {
      const rect = { left: 0, top: 0, right: win.innerWidth, bottom: win.innerHeight };
      return computeScrollVelocity(rect, point, edgeSize, maxSpeed);
    },
    scrollBy(dx: number, dy: number): void {
      win.scrollBy(dx, dy);
    },
  };
}

/**
 * Creates an auto-scroller that drives a `requestAnimationFrame` loop while a
 * pointer drag is near a scroll edge. The candidates are the scrollable
 * containers from the list (or the one under the pointer) outward, then the
 * viewport; each frame scrolls the innermost candidate whose rect holds the
 * pointer, whose edge band the pointer is in, and which can still scroll that
 * way. Deltas are applied instantaneously per frame — no CSS smooth-scroll
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

  let targets: readonly ScrollTarget[] = [];
  let point: { x: number; y: number } | null = null;
  let rafId: number | null = null;

  function resolveTargets(at: { x: number; y: number }): readonly ScrollTarget[] {
    const start = config.resolveScrollHost
      ? (config.resolveScrollHost(at) ?? config.host)
      : config.host;
    return [
      ...findScrollContainers(start, win).map((el) => elementTarget(el, win)),
      viewportTarget(win),
    ];
  }

  function activeScroll(at: {
    x: number;
    y: number;
  }): { target: ScrollTarget; v: AutoScrollVelocity } | null {
    for (const target of targets) {
      const v = target.velocity(at, config.edgeSize, config.maxSpeed);
      if (v.x !== 0 || v.y !== 0) {
        return { target, v };
      }
    }
    return null;
  }

  function tick(): void {
    rafId = null;
    if (point === null) {
      return;
    }
    const active = activeScroll(point);
    if (active === null) {
      return;
    }
    active.target.scrollBy(active.v.x, active.v.y);
    config.onFrame();
    rafId = win.requestAnimationFrame(tick);
  }

  return {
    update(next: { x: number; y: number }): void {
      point = next;
      targets = resolveTargets(next);
      if (activeScroll(next) === null) {
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
      targets = [];
      point = null;
    },
  };
}
