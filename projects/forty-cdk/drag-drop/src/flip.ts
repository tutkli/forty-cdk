/** A minimal positioned rect — only the top-left corner is needed for a FLIP translate. */
export interface FlipRect {
  readonly left: number;
  readonly top: number;
}

/** The inverted translate (in px) that visually returns `last` to `first`. */
export interface FlipDelta {
  readonly dx: number;
  readonly dy: number;
}

/** Pure: the translate that moves an element from its Last position back to its First. */
export function flipDelta(first: FlipRect, last: FlipRect): FlipDelta {
  return { dx: first.left - last.left, dy: first.top - last.top };
}

/** Styling hook attribute set on each element while its FLIP transition plays. */
export const FLIP_ANIMATING_ATTR = 'data-drag-animating';

/** Configuration for {@link playFlip}. */
export interface PlayFlipConfig {
  /** Element → its First (pre-change) rect, captured before the data change. */
  readonly first: ReadonlyMap<HTMLElement, FlipRect>;
  /** The browser window (for reflow + timeout), or `null` in SSR / non-DOM environments. */
  readonly win: Window | null;
  /** An element to leave untouched (the dragged host handled by drop-settle). */
  readonly exclude?: HTMLElement | null;
  /** Safety timeout (ms) after which the animating attribute is force-cleared. */
  readonly fallbackMs?: number;
}

/**
 * Runs the Invert + Play steps of a FLIP transition for every element in `first` that is still
 * connected and has moved. Measures Last via `getBoundingClientRect`, applies the inverted
 * transform with the transition suppressed, forces a reflow, then transitions back to identity
 * while `data-drag-animating` is present so a consumer CSS rule keyed on it governs duration /
 * easing. No-op when `win` is `null`. The library imposes no duration of its own.
 */
export function playFlip(config: PlayFlipConfig): void {
  const { first, win, exclude, fallbackMs: fallbackMsInput } = config;
  if (!win) {
    return;
  }
  const fallbackMs = fallbackMsInput ?? 500;

  const workList: { el: HTMLElement; d: FlipDelta }[] = [];
  for (const [el, firstRect] of first) {
    if (el === exclude) {
      continue;
    }
    if (!el.isConnected) {
      continue;
    }
    const r = el.getBoundingClientRect();
    const d = flipDelta(firstRect, r);
    if (d.dx === 0 && d.dy === 0) {
      continue;
    }
    workList.push({ el, d });
  }

  if (workList.length === 0) {
    return;
  }

  for (const { el, d } of workList) {
    el.style.transition = 'none';
    el.style.transform = `translate(${d.dx}px, ${d.dy}px)`;
  }

  void workList[0]!.el.offsetWidth;

  for (const { el } of workList) {
    el.setAttribute(FLIP_ANIMATING_ATTR, '');
    el.style.transition = '';
    el.style.transform = '';

    let done = false;
    const controller = new AbortController();
    const clear = (): void => {
      if (done) {
        return;
      }
      done = true;
      el.removeAttribute(FLIP_ANIMATING_ATTR);
      el.style.transform = '';
      el.style.transition = '';
      controller.abort();
    };

    const onEnd = (event: TransitionEvent): void => {
      if (event.propertyName && event.propertyName !== 'transform') {
        return;
      }
      clear();
    };

    el.addEventListener('transitionend', onEnd, { once: true, signal: controller.signal });
    win.setTimeout(clear, fallbackMs);
  }
}
