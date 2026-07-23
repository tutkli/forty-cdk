const INTERACTIVE_ROLES = [
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'textbox',
  'searchbox',
  'combobox',
  'slider',
  'spinbutton',
  'treeitem',
];

const INTERACTIVE_DESCENDANT_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  'audio[controls]',
  'video[controls]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[contenteditable="plaintext-only"]',
  ...INTERACTIVE_ROLES.map((role) => `[role="${role}"]`),
].join(', ');

/**
 * Whether `event` originated from an interactive element nested inside the row it
 * is bound to — a consumer-placed `button`, `a[href]`, `input`, `select`,
 * `textarea`, `summary`, `label`, `audio`/`video[controls]`, an editable
 * `contenteditable` region (`""` / `"true"` / `"plaintext-only"`, but not
 * `"false"`), or an element carrying an interactive ARIA `role` descendant of the
 * row host. Resolves the event target's closest interactive element and reports
 * `true` only when it is a strict descendant of `event.currentTarget` (the row),
 * so a plain click on cell text, the gaps between cells, or the row host itself
 * reports `false`. Shared by the two row-interaction call sites — `ForTableBody`'s
 * whole-row activation and `ForTableRow`'s selection — so both skip firing for
 * clicks the inner control owns.
 */
export function eventFromInteractiveDescendant(event: Event): boolean {
  const target = event.target;
  const rowEl = event.currentTarget;
  if (!(target instanceof Element) || !(rowEl instanceof HTMLElement)) {
    return false;
  }
  const interactive = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
  return interactive !== null && interactive !== rowEl && rowEl.contains(interactive);
}
