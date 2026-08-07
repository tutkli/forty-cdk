import { composedParentElement } from '../composed-tree/composed-tree';

/**
 * Shared CSS selector for focusable elements. Single source of truth for the
 * library — primitives that need their own focus-finding logic (e.g. the
 * dialog directive's non-modal initial focus, the programmatic dialog
 * manager's bootstrap, future menu / popover initial-focus paths) import
 * this rather than maintaining a private copy that drifts.
 *
 * This matches elements that can *receive* focus — the superset used for
 * initial-focus targets. A natively-focusable element carrying
 * `tabindex="-1"` (e.g. a `<button tabindex="-1">` roving-tabindex
 * collection item) still matches via its tag selector, but is excluded from
 * the sequential Tab cycle at runtime by `isTabbableCandidate`. `iframe` and
 * `summary` are included because both are natively focusable and can
 * legitimately be an initial-focus target inside a trapped surface.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'summary',
].join(',');

/**
 * Every element under `container` matching {@link FOCUSABLE_SELECTOR}, in
 * composed-tree order, descending into open shadow roots.
 *
 * The walk enumerates elements and filters in JS rather than handing the selector to the engine,
 * because `querySelectorAll` stops at a shadow boundary and a shadow host is not expressible in
 * CSS. `container`'s own shadow root is traversed before its light children, matching what
 * `composedContains` already counts as inside it. Closed shadow roots stay invisible.
 *
 * **Order** follows the light tree with each host's shadow contents inlined at the host — the
 * flattened order for a host that renders no `<slot>`. Once content is slotted the two diverge:
 * assigned nodes are visited with the light tree, after the whole shadow tree, whereas the browser
 * sequences them at the `<slot>`'s position. A host with focusables after its `<slot>` therefore
 * yields a first / last pair the real Tab cycle disagrees with.
 */
export function queryFocusableCandidates(container: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  if (container.shadowRoot) {
    collectFocusableCandidates(container.shadowRoot, found);
  }
  collectFocusableCandidates(container, found);
  return found;
}

/**
 * Reports whether `el` can currently receive focus. An element is excluded when it:
 *
 * - carries the `[hidden]` attribute;
 * - carries `[inert]` itself, or is nested under an `[inert]` ancestor below `root`;
 * - is hidden via CSS (`display: none` on the element or any ancestor below `root`, or
 *   `visibility: hidden` / `collapse` on the element itself).
 *
 * `root` bounds the ancestor walk, so the container's own state is never consulted. Both walks
 * climb the composed tree, so an `[inert]` or `display: none` shadow host disqualifies the controls
 * inside its shadow root.
 *
 * This is the *focusable* set, not the Tab cycle: a candidate carrying `tabindex="-1"` qualifies.
 *
 * Reads `getComputedStyle`, so callers must gate it behind `isPlatformBrowser`.
 */
export function isFocusableCandidate(el: HTMLElement, root: HTMLElement): boolean {
  return !el.hasAttribute('hidden') && !hasInertAncestor(el, root) && !isCssHidden(el, root);
}

/**
 * Reports whether `el` is a *tabbable* candidate — a focusable candidate
 * (`isFocusableCandidate`) that also participates in the sequential Tab cycle
 * (`tabIndex >= 0`). A natively-focusable element carrying `tabindex="-1"` is
 * a valid focus target but is excluded here.
 */
export function isTabbableCandidate(el: HTMLElement, root: HTMLElement): boolean {
  return el.tabIndex >= 0 && isFocusableCandidate(el, root);
}

/**
 * The ten local names {@link FOCUSABLE_SELECTOR} anchors a clause on. Lowercase
 * and compared against `localName` rather than `tagName`, so the two agree on a
 * non-HTML-namespaced element: an SVG `<a href>` is matched by the selector's
 * `a[href]` clause and reports `tagName` `'a'`, which an uppercase set would
 * drop.
 */
const FOCUSABLE_LOCAL_NAMES = new Set([
  'a',
  'area',
  'button',
  'input',
  'select',
  'textarea',
  'audio',
  'video',
  'iframe',
  'summary',
]);

/**
 * Whether `el` could possibly match {@link FOCUSABLE_SELECTOR} — a deliberate superset, so `false`
 * is a safe skip and `true` still has to clear the selector itself.
 *
 * Every clause of that selector is anchored on one of {@link FOCUSABLE_LOCAL_NAMES}, on
 * `[tabindex]:not([tabindex="-1"])`, or on `[contenteditable="true"]`, which lets a structural
 * element answer without entering the selector engine. That correspondence is not expressible in a
 * type: a clause added to the selector without a matching anchor here silently narrows the
 * focusable set, and `focusable-candidate.spec.ts` fails when the two drift.
 */
function mayMatchFocusableSelector(el: Element): boolean {
  if (FOCUSABLE_LOCAL_NAMES.has(el.localName)) {
    return true;
  }
  const tabindex = el.getAttribute('tabindex');
  return (tabindex !== null && tabindex !== '-1') || el.hasAttribute('contenteditable');
}

function collectFocusableCandidates(root: ParentNode, found: HTMLElement[]): void {
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    if (mayMatchFocusableSelector(el) && el.matches(FOCUSABLE_SELECTOR)) {
      found.push(el);
    }
    const shadow = el.shadowRoot;
    if (shadow) {
      collectFocusableCandidates(shadow, found);
    }
  }
}

function hasInertAncestor(el: HTMLElement, root: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    if (cur.hasAttribute('inert')) {
      return true;
    }
    cur = composedParentElement(cur);
  }
  return false;
}

function isCssHidden(el: HTMLElement, root: HTMLElement): boolean {
  const win = el.ownerDocument.defaultView;
  if (!win || typeof win.getComputedStyle !== 'function') {
    return false;
  }
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    const style = win.getComputedStyle(cur);
    if (style.display === 'none') {
      return true;
    }
    if (cur === el && (style.visibility === 'hidden' || style.visibility === 'collapse')) {
      return true;
    }
    cur = composedParentElement(cur);
  }
  return false;
}
