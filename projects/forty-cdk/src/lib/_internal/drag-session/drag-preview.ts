/** A floating clone of the dragged element that follows the pointer. */
export interface DragPreview {
  /** Position the preview's top-left at `(x, y)` in viewport coordinates. */
  moveTo(x: number, y: number): void;
  /** Remove the preview from the DOM. Idempotent. */
  destroy(): void;
}

/**
 * Creates a default drag preview: a fixed-position clone of `source` appended to `doc.body`, sized to the
 * source's current bounding box, non-interactive, and hidden from assistive tech. Caller must gate on a
 * browser platform.
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

  const descendants = clone.querySelectorAll('[data-testid]');
  descendants.forEach((el) => el.removeAttribute('data-testid'));

  doc.body.appendChild(clone);

  return {
    moveTo(x: number, y: number): void {
      clone.style.transform = `translate(${x}px, ${y}px)`;
    },
    destroy(): void {
      clone.remove();
    },
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

  return {
    moveTo(x: number, y: number): void {
      wrapper.style.transform = `translate(${x}px, ${y}px)`;
    },
    destroy(): void {
      onDestroy();
      wrapper.remove();
    },
  };
}
