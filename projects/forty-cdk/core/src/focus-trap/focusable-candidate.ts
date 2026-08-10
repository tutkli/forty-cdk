import { composedParentElement } from '../composed-tree/composed-tree';

/**
 * The ten local names {@link FOCUSABLE_SELECTOR} anchors a clause on, each
 * mapped to the qualifier that clause carries — `[href]` for the two link
 * elements, `[controls]` for the two media ones, `:not([disabled])` for the
 * form controls, and nothing for the two that are focusable on their own.
 * Keys are lowercase and compared against `localName` rather than `tagName`,
 * so the two agree on a non-HTML-namespaced element: an SVG `<a href>` is
 * matched by the selector's `a[href]` clause and reports `tagName` `'a'`,
 * which an uppercase set would drop.
 */
const FOCUSABLE_LOCAL_NAME_QUALIFIERS: Readonly<Record<string, string>> = {
  a: '[href]',
  area: '[href]',
  button: ':not([disabled])',
  input: ':not([disabled]):not([type="hidden"])',
  select: ':not([disabled])',
  textarea: ':not([disabled])',
  audio: '[controls]',
  video: '[controls]',
  iframe: '',
  summary: '',
};

/**
 * The two clauses {@link FOCUSABLE_SELECTOR} anchors on an attribute rather
 * than on a local name, so any element can match them.
 */
const FOCUSABLE_ATTRIBUTE_CLAUSES = ['[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]'];

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
 *
 * Derived from {@link FOCUSABLE_LOCAL_NAME_QUALIFIERS} plus
 * {@link FOCUSABLE_ATTRIBUTE_CLAUSES} so the pre-filter below cannot fall out
 * of step with it — the correspondence the two used to keep by hand is now
 * structural. `focusable-candidate.spec.ts` pins the derived clause set
 * against the literal it replaced.
 */
export const FOCUSABLE_SELECTOR = [
  ...Object.entries(FOCUSABLE_LOCAL_NAME_QUALIFIERS).map(([name, qualifier]) => name + qualifier),
  ...FOCUSABLE_ATTRIBUTE_CLAUSES,
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

/** The two ends of a container's Tab cycle, as resolved by {@link findTabbableEdges}. */
export interface TabbableEdges {
  /** First tabbable descendant in candidate order, or `null` when the container has none. */
  first: HTMLElement | null;
  /** Last tabbable descendant; the same element as `first` when only one qualifies. */
  last: HTMLElement | null;
}

/**
 * The first and last tabbable descendants of `container`, resolved from a single
 * {@link queryFocusableCandidates} enumeration.
 *
 * Only the two ends are ever needed to cycle Tab, so the filter runs from each end and stops on the
 * first candidate that qualifies instead of resolving the whole set. That is what keeps the cost of
 * a keystroke off the size of the surface: `isFocusableCandidate` climbs the composed ancestor chain
 * calling `getComputedStyle` at every level, so filtering N candidates to read two of them costs
 * O(N × depth) forced style recalculations where O(depth) will do. The cheap `tabIndex` half of the
 * test is what makes the scan short on a roving collection too — every item carrying
 * `tabindex="-1"` is rejected without a style read.
 *
 * Both ends are `null` only when the container has no tabbable descendant at all, which is the one
 * case that still walks every candidate.
 */
export function findTabbableEdges(container: HTMLElement): TabbableEdges {
  const candidates = queryFocusableCandidates(container);
  const firstIndex = candidates.findIndex((el) => isTabbableCandidate(el, container));
  if (firstIndex === -1) {
    return { first: null, last: null };
  }
  const first = candidates[firstIndex]!;
  for (let i = candidates.length - 1; i > firstIndex; i--) {
    const candidate = candidates[i]!;
    if (isTabbableCandidate(candidate, container)) {
      return { first, last: candidate };
    }
  }
  return { first, last: first };
}

const FOCUSABLE_LOCAL_NAMES = new Set(Object.keys(FOCUSABLE_LOCAL_NAME_QUALIFIERS));

/**
 * Whether `el` could possibly match {@link FOCUSABLE_SELECTOR} — a deliberate superset, so `false`
 * is a safe skip and `true` still has to clear the selector itself.
 *
 * Every clause of that selector is anchored on one of {@link FOCUSABLE_LOCAL_NAMES}, on
 * `[tabindex]:not([tabindex="-1"])`, or on `[contenteditable="true"]`, which lets a structural
 * element answer without entering the selector engine. The name-anchored half is the same
 * declaration the selector is built from, so a name can no longer be added to one and not the
 * other; the two attribute clauses are matched here in their deliberately relaxed form (any
 * `contenteditable` value, not only `"true"`), which is what keeps this a superset.
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
