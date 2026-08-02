/**
 * Resolves the element that actually holds focus, descending through open
 * shadow roots.
 *
 * `document.activeElement` reports the shadow **host** while focus sits inside
 * a shadow tree, so any check that compares it against a specific descendant —
 * the focus trap's first / last tabbable, an "is focus still mine?" guard —
 * answers about the host instead of about the focused control.
 *
 * A closed shadow root exposes no `activeElement`, so the walk stops at its
 * host: the library resolves through open shadow roots only.
 */
export function resolveActiveElement(root: DocumentOrShadowRoot): Element | null {
  let active = root.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * Resolves the effective target of an interaction event for containment
 * checks. Prefers `composedPath()[0]` so a pointer-down / focus inside a shadow
 * tree reports the real originating node rather than the shadow host the event
 * was retargeted to. Falls back to `event.target` in environments without
 * `composedPath`.
 */
export function resolveEventTarget(event: Event): Node | null {
  const path = event.composedPath?.();
  const first = path && path.length > 0 ? path[0] : null;
  return (first ?? event.target) as Node | null;
}

/**
 * Whether `node` sits inside `container` in the composed tree: native
 * `contains`, plus a walk up through every open shadow boundary between the
 * two.
 *
 * `Node.contains` answers within a single node tree, so it reports `false` for
 * a node inside a shadow root nested in `container` — which is what makes
 * {@link resolveEventTarget} unsafe on its own: the deep target it resolves is
 * exactly the one plain containment then disowns, turning a press on a web
 * component inside an overlay into an outside-dismissal.
 */
export function composedContains(container: Node, node: Node | null): boolean {
  let current = node;
  while (current) {
    if (container.contains(current)) {
      return true;
    }
    current = shadowHostOf(current);
  }
  return false;
}

/**
 * The element `node` hangs from in the composed tree: its `parentElement`, or
 * the host of the shadow root it is a top-level child of. Bounded ancestor
 * walks use this so a shadow boundary continues the walk instead of silently
 * ending it one element short of the root they were bounded by.
 */
export function composedParentElement(node: Node): HTMLElement | null {
  const parent = node.parentNode;
  if (parent !== null && isShadowRoot(parent)) {
    return parent.host as HTMLElement;
  }
  return node.parentElement;
}

/**
 * The nearest inclusive ancestor of `node` matching `selector`, searching
 * across every open shadow boundary above it.
 *
 * The composed-tree counterpart of `Element.closest`, which — like
 * `querySelectorAll` and `Node.contains` — answers within a single node tree
 * and returns `null` for a match that lives above a shadow host. It pairs with
 * {@link resolveActiveElement}: resolving the deep active element and then
 * asking plain `closest` about it is the same half-applied posture
 * {@link composedContains} exists to prevent — the resolution hands over a node
 * from inside the shadow tree, which is exactly the one the un-composed walk
 * cannot climb out of.
 *
 * Each level delegates to the native `closest`, so the fast path inside a tree
 * stays the engine's; only the hop to the next host is done here.
 */
export function composedClosest(node: Element, selector: string): HTMLElement | null {
  let current: Element | null = node;
  while (current) {
    const match = current.closest<HTMLElement>(selector);
    if (match) {
      return match;
    }
    current = shadowHostOf(current);
  }
  return null;
}

function shadowHostOf(node: Node): Element | null {
  const root = node.getRootNode();
  return root !== node && isShadowRoot(root) ? root.host : null;
}

/**
 * Narrows to an open shadow root. The `nodeType` half is load-bearing: `host`
 * alone is also a property of `<a>` / `<area>` / `<link>` (the URL's host), so
 * a duck-type on the name alone reads an anchor ancestor as a shadow boundary
 * and returns a string where an element belongs. Reading the constant off the
 * instance keeps the check free of the `Node` global, so it costs nothing on a
 * server.
 */
function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === node.DOCUMENT_FRAGMENT_NODE && 'host' in node;
}
