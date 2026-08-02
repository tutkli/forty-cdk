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
 * `querySelectorAll` answers within a single node tree, so a plain query stops
 * at a shadow boundary and never sees the controls a consumer's web component
 * renders inside its own shadow root — the focus trap then computes a first /
 * last pair that excludes them, and Tab escapes the surface. The walk therefore
 * enumerates every element and filters in JS rather than handing the selector to
 * the engine, because a shadow host is not expressible in CSS.
 *
 * Enumerating is what costs, and it runs on every `Tab` while a trap is topmost.
 * A non-virtualized `[forTable]` inside a `[forDialog]` — the surface
 * `/dialog-large-table` builds in the harness — reaches five figures of
 * elements, and a `matches` call per element put `Tab`-to-focus-move at
 * **6.2 ms** there against **0.3 ms** on a one-row surface. The selector is now
 * reached only through `mayMatchFocusableSelector`, a superset test that takes
 * the same press to **3.5 ms**
 * ([#1620](https://github.com/tutkli/forty-cdk/issues/1620)).
 *
 * **Do not expect much more from this shape.** Timed in isolation over 10k
 * elements (desktop Chromium, median of 200 runs), the walk goes 4.2 ms → 2.6 ms,
 * against a **1.6 ms floor** for enumerating the subtree and reading
 * `shadowRoot` on each element — which no filter can avoid, because a shadow
 * host is what the enumeration exists to find. The single engine-side
 * `querySelectorAll(FOCUSABLE_SELECTOR)` that predates #1586 measured 1.9 ms on
 * the same subtree, so the composed-tree posture now costs ~0.7 ms over the
 * answer that missed shadow content, rather than 2.3 ms. Handing the match back
 * to the engine and interleaving through a `Set` was measured too, at 3.6 ms:
 * worse than the pre-filter, because the second pass costs more than the
 * matching it saves.
 *
 * `container`'s **own** shadow root is traversed too, before its light
 * children. Skipping it would leave the query disagreeing with
 * `composedContains`, which already counts the container's shadow contents as
 * inside it — and the shape is not exotic: a consumer component using
 * `ViewEncapsulation.ShadowDom` and composing an overlay primitive through
 * `hostDirectives` renders its entire surface there, so the trap would find no
 * tabbable at all and Tab would move nothing.
 *
 * A closed shadow root exposes no `shadowRoot`, so its contents stay invisible
 * here — the library descends through open shadow roots only.
 *
 * **Order** follows the light tree with each host's shadow contents inlined at
 * the host. That is the flattened order for a host that renders no `<slot>`,
 * which is the common case for a widget with its own controls. It is *not* the
 * flattened order once slotted content is involved: assigned nodes are visited
 * with the light tree, after the whole shadow tree, whereas the browser
 * sequences them at the `<slot>`'s position. So a host with focusables after
 * its `<slot>` yields a first / last pair the Tab cycle disagrees with —
 * reordering slots is not required, one trailing focusable is enough.
 * Resolving that needs `assignedElements()` per slot and is deliberately out of
 * scope here.
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
 * decided the container is in play. Both walks climb the **composed** tree, so
 * an `[inert]` or `display: none` shadow host disqualifies the controls inside
 * its shadow root; a `parentElement` walk would have stopped at the boundary
 * and reported them focusable, which is the answer
 * {@link queryFocusableCandidates} now hands them to be filtered from.
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
 * Whether `el` could possibly match {@link FOCUSABLE_SELECTOR} — a deliberate
 * **superset** of it, so a `false` here is a safe skip and a `true` still has to
 * clear the selector itself. Every clause of that list is anchored on one of
 * {@link FOCUSABLE_LOCAL_NAMES}, on `[tabindex]:not([tabindex="-1"])`, or on
 * `[contenteditable="true"]`; a structural `div` / `td` / `span` — which is what
 * a large subtree is made of — answers `false` in a set lookup and two attribute
 * probes, none of which enter the selector engine.
 *
 * The `tabindex` branch reproduces its clause exactly rather than settling for
 * `hasAttribute`, and that precision is the whole point: a roving-tabindex
 * collection puts `tabindex="-1"` on **every** item, so `[forTable]` in `grid`
 * mode — the composition this exists for — would pass a presence-only pre-filter
 * on every cell and pay the selector anyway. Attribute values are matched
 * case-sensitively, so the string comparison and the CSS agree.
 *
 * Reject on the local name alone and a `<button tabindex="-1">` roving item
 * would vanish from the focusable set, which is the opposite error: it matches
 * through its tag clause and is a legitimate focus target.
 *
 * The correspondence with {@link FOCUSABLE_SELECTOR} is what makes this correct
 * and is not expressible in a type — a clause added there without a matching
 * anchor here silently narrows the focusable set. `focusable-candidate.spec.ts`
 * enumerates the clauses and fails when the two drift.
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
