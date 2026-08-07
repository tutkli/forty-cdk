/** A floating clone of the dragged element that follows the pointer. */
export interface DragPreview {
  /** Position the preview's top-left at `(x, y)` in viewport coordinates. */
  moveTo(x: number, y: number): void;
  /**
   * Transition the preview's top-left to `(x, y)`, then `destroy()` it once the transform
   * transition ends (with a timeout fallback scaled from the element's computed
   * `transition-duration` plus a small safety margin, so a transition longer than the old
   * hard-coded 500 ms is not cut short). Marks the element `data-settling` so a consumer
   * CSS rule keyed on it governs duration / easing. If no transition is configured, destroys
   * immediately. Caller must pass the browser `Window`.
   */
  settle(x: number, y: number, win: Window): void;
  /** Remove the preview from the DOM. Idempotent. */
  destroy(): void;
}

const SETTLE_TIMEOUT_SAFETY_MS = 50;

function parseDurationMs(segment: string): number {
  const value = parseFloat(segment);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return segment.trim().endsWith('ms') ? value : value * 1000;
}

function attachSettle(target: HTMLElement, destroyFn: () => void): DragPreview['settle'] {
  return (x: number, y: number, win: Window): void => {
    target.setAttribute('data-settling', '');
    void target.offsetWidth;
    const duration = win.getComputedStyle(target).transitionDuration;
    const firstSegment = duration.split(',')[0]?.trim() ?? '';
    const durationMs = parseDurationMs(firstSegment);
    if (!firstSegment || durationMs === 0) {
      target.style.transform = `translate(${x}px, ${y}px)`;
      destroyFn();
      return;
    }
    let finished = false;
    const controller = new AbortController();
    const finish = (): void => {
      if (finished) {
        return;
      }
      finished = true;
      controller.abort();
      destroyFn();
    };
    const onEnd = (event: TransitionEvent): void => {
      if (event.propertyName && event.propertyName !== 'transform') {
        return;
      }
      finish();
    };
    target.addEventListener('transitionend', onEnd, { once: true, signal: controller.signal });
    win.setTimeout(finish, durationMs + SETTLE_TIMEOUT_SAFETY_MS);
    target.style.transform = `translate(${x}px, ${y}px)`;
  };
}

/**
 * Wraps a minimal preview (with only `moveTo` and `destroy`) into a full `DragPreview`.
 * The `settle` implementation falls back to an immediate `destroy` call since the wrapped
 * object carries no DOM element to animate. Used when a caller-supplied preview does not yet
 * implement `settle`.
 */
export function wrapPreview(preview: {
  moveTo(x: number, y: number): void;
  destroy(): void;
}): DragPreview {
  return {
    moveTo: (x, y) => preview.moveTo(x, y),
    settle: (_x, _y, _win) => {
      preview.destroy();
    },
    destroy: () => preview.destroy(),
  };
}

/**
 * Creates a default drag preview: a fixed-position clone of `source` appended to `doc.body`, sized to the
 * source's current bounding box, non-interactive, and hidden from assistive tech. Caller must gate on a
 * browser platform.
 *
 * `id` and `data-testid` are stripped from the clone root and from every descendant carrying one, so the
 * preview is never reachable through a hook that identifies a single element: duplicating an `id` while the
 * preview lives makes the document invalid (and `getElementById` ambiguous) regardless of `aria-hidden`.
 * The clone still answers the source's own attribute selectors — a directive selector such as
 * `[forDraggable]`, plus `data-index` where the source carries one — so code enumerating items by selector
 * during a drag must exclude `[data-for-drag-preview]`.
 */
export function createDragPreview(source: HTMLElement, doc: Document): DragPreview {
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;

  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.boxSizing = 'border-box';
  clone.style.zIndex = '2147483647';

  clone.setAttribute('data-for-drag-preview', '');
  clone.setAttribute('aria-hidden', 'true');
  clone.removeAttribute('data-testid');
  clone.removeAttribute('id');

  const descendants = clone.querySelectorAll('[data-testid], [id]');
  descendants.forEach((el) => {
    el.removeAttribute('data-testid');
    el.removeAttribute('id');
  });

  doc.body.appendChild(clone);

  const destroy = (): void => {
    clone.remove();
  };

  return {
    moveTo(x: number, y: number): void {
      clone.style.transform = `translate(${x}px, ${y}px)`;
    },
    settle: attachSettle(clone, destroy),
    destroy,
  };
}

/**
 * Creates a drag preview from caller-supplied root nodes (e.g. an Angular embedded view's
 * `rootNodes`): wraps them in a fixed-position, non-interactive, assistive-tech-hidden container
 * appended to `doc.body`. `onDestroy` runs on teardown (before the wrapper is removed) so the
 * caller can dispose the backing view. Caller must gate on a browser platform.
 */
export function createTemplatePreview(
  nodes: readonly Node[],
  doc: Document,
  onDestroy: () => void,
): DragPreview {
  const wrapper = doc.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.margin = '0';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '2147483647';
  wrapper.setAttribute('data-for-drag-preview', '');
  wrapper.setAttribute('aria-hidden', 'true');

  for (const node of nodes) {
    wrapper.appendChild(node);
  }
  doc.body.appendChild(wrapper);

  const destroy = (): void => {
    onDestroy();
    wrapper.remove();
  };

  return {
    moveTo(x: number, y: number): void {
      wrapper.style.transform = `translate(${x}px, ${y}px)`;
    },
    settle: attachSettle(wrapper, destroy),
    destroy,
  };
}
