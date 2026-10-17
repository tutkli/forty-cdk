import { stampAmbientDirection } from '../text-direction/text-direction';

/** A floating clone of the dragged element that follows the pointer. */
export interface DragPreview {
  /**
   * The element that floats under the pointer. When present, a boundary clamp keeps this
   * element's box inside the boundary; when absent, it keeps the dragged item's box inside.
   */
  readonly element?: HTMLElement;
  /** Position the preview's top-left at `(x, y)` in viewport coordinates. */
  moveTo(x: number, y: number): void;
  /**
   * Transition the preview's top-left to `(x, y)`, then `destroy()` it once the transform
   * transition ends. Marks the element `data-settling` so a consumer CSS rule keyed on it
   * governs duration / easing. A fallback timeout covers a `transitionend` that never arrives:
   * it waits for the delay plus duration of the computed transition on `transform` (or `all`),
   * or of the longest configured transition when none animates `transform`, plus a small safety
   * margin. If no transition is configured, destroys immediately. Caller must pass the browser
   * `Window`.
   */
  settle(x: number, y: number, win: Window): void;
  /** Remove the preview from the DOM. Idempotent. */
  destroy(): void;
}

const SETTLE_TIMEOUT_SAFETY_MS = 50;

function parseTimeMs(segment: string): number {
  const value = parseFloat(segment);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return segment.endsWith('ms') ? value : value * 1000;
}

function splitList(value: string | undefined): string[] {
  return value ? value.split(',').map((segment) => segment.trim()) : [];
}

function settleEndMs(style: CSSStyleDeclaration): number {
  const durations = splitList(style.transitionDuration);
  if (durations.length === 0) {
    return 0;
  }
  const delays = splitList(style.transitionDelay);
  const properties = splitList(style.transitionProperty);
  let transformEnd = 0;
  let longestEnd = 0;
  (properties.length > 0 ? properties : ['all']).forEach((property, i) => {
    if (property === 'none') {
      return;
    }
    const duration = parseTimeMs(durations[i % durations.length] ?? '');
    const delay = delays.length > 0 ? parseTimeMs(delays[i % delays.length] ?? '') : 0;
    const end = duration > 0 ? Math.max(0, duration + delay) : 0;
    longestEnd = Math.max(longestEnd, end);
    if (property === 'transform' || property === 'all') {
      transformEnd = end;
    }
  });
  return transformEnd || longestEnd;
}

function attachSettle(target: HTMLElement, destroyFn: () => void): DragPreview['settle'] {
  return (x: number, y: number, win: Window): void => {
    target.setAttribute('data-settling', '');
    void target.offsetWidth;
    const endMs = settleEndMs(win.getComputedStyle(target));
    if (endMs === 0) {
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
    win.setTimeout(finish, endMs + SETTLE_TIMEOUT_SAFETY_MS);
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

const IDENTITY_HOOKS = ['id', 'data-testid'];

const LIVE_ATTRIBUTES = ['name', 'form', 'autofocus', 'autoplay'];

const EMBEDDED_CONTENT = 'iframe, object, embed';

function selfAndDescendants(root: HTMLElement, selector: string): HTMLElement[] {
  const descendants = Array.from(root.querySelectorAll<HTMLElement>(selector));
  return root.matches(selector) ? [root, ...descendants] : descendants;
}

function stripAttributes(root: HTMLElement, names: readonly string[]): void {
  for (const el of selfAndDescendants(root, names.map((name) => `[${name}]`).join(', '))) {
    for (const name of names) {
      el.removeAttribute(name);
    }
  }
}

function replaceEmbeddedContent(clone: HTMLElement, source: HTMLElement, doc: Document): void {
  const originals = source.querySelectorAll(EMBEDDED_CONTENT);
  clone.querySelectorAll(EMBEDDED_CONTENT).forEach((embedded, i) => {
    const rect = originals[i]?.getBoundingClientRect();
    const box = doc.createElement('div');
    box.style.display = 'inline-block';
    box.style.width = `${rect?.width ?? 0}px`;
    box.style.height = `${rect?.height ?? 0}px`;
    embedded.replaceWith(box);
  });
}

/**
 * Creates a default drag preview: a fixed-position clone of `source` appended to `doc.body`, sized to the
 * source's current bounding box, non-interactive, and hidden from assistive tech. The clone carries the
 * writing direction declared at `source`, so it keeps the alignment and bidi ordering of the item it
 * floats away from. Caller must gate on a browser platform.
 *
 * `id` and `data-testid` are stripped from the clone root and from every descendant carrying one, so the
 * preview is never reachable through a hook that identifies a single element: duplicating an `id` while the
 * preview lives makes the document invalid (and `getElementById` ambiguous) regardless of `aria-hidden`.
 * The clone still answers the source's own attribute selectors — a directive selector such as
 * `[forDraggable]`, plus `data-index` where the source carries one — so code enumerating items by selector
 * during a drag must exclude `[data-for-drag-preview]`.
 *
 * The clone's live content is made inert before it joins the document: `name` and `form` are stripped so a
 * cloned control never joins the source's radio group or form (a checked radio would otherwise uncheck the
 * source's), `autofocus` and `autoplay` are stripped, and every `iframe`, `object` and `embed` is replaced by
 * an empty box the size of the source's, so nothing reloads or plays.
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
  stripAttributes(clone, IDENTITY_HOOKS);
  stripAttributes(clone, LIVE_ATTRIBUTES);
  replaceEmbeddedContent(clone, source, doc);

  stampAmbientDirection(clone, source);
  doc.body.appendChild(clone);

  const destroy = (): void => {
    clone.remove();
  };

  return {
    element: clone,
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
 * caller can dispose the backing view. The wrapper carries the writing direction declared at
 * `source`, the dragged item's host. Caller must gate on a browser platform.
 */
export function createTemplatePreview(
  nodes: readonly Node[],
  source: Element,
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
  stampAmbientDirection(wrapper, source);
  doc.body.appendChild(wrapper);

  const destroy = (): void => {
    onDestroy();
    wrapper.remove();
  };

  return {
    element: wrapper,
    moveTo(x: number, y: number): void {
      wrapper.style.transform = `translate(${x}px, ${y}px)`;
    },
    settle: attachSettle(wrapper, destroy),
    destroy,
  };
}
