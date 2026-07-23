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
 * Reports whether `el` can currently *receive* focus, applying the library's
 * single focusable-candidate filter. An element is excluded when it:
 *
 * - carries the `[hidden]` attribute;
 * - carries `[inert]` itself, or is nested under an `[inert]` ancestor below
 *   `root`;
 * - is hidden via CSS (`display: none` on the element or any ancestor below
 *   `root`, or `visibility: hidden` / `collapse` on the element itself).
 *
 * `root` bounds the ancestor walk so the container's own state (and anything
 * above it in the document) is never consulted — the caller has already
 * decided the container is in play.
 *
 * This is the one predicate `FocusTrap` and `injectHasFocusableContent` both
 * consume; keeping it here is what stops their answers from drifting (the CSS
 * chain-walk was added for the trap in #1178 but never propagated to the
 * focusable-content sibling — #1382). Matched via `FOCUSABLE_SELECTOR`, this
 * is the *focusable* set: a candidate carrying `tabindex="-1"` is a valid
 * focus target even though it never participates in the Tab cycle.
 *
 * The CSS check reads `getComputedStyle`, so it must only run in a browser;
 * off-browser callers gate the whole traversal behind `isPlatformBrowser`.
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

function hasInertAncestor(el: HTMLElement, root: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  while (cur && cur !== root) {
    if (cur.hasAttribute('inert')) {
      return true;
    }
    cur = cur.parentElement;
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
    cur = cur.parentElement;
  }
  return false;
}
