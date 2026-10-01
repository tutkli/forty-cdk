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
 * Whether `event` originated from an interactive element nested inside the element
 * whose listener received it (`event.currentTarget`, typically a row): a `button`,
 * `a[href]`, `input`, `select`, `textarea`, `summary`, `label`,
 * `audio`/`video[controls]`, an editable `contenteditable` region (`""` / `"true"` /
 * `"plaintext-only"`, but not `"false"`), or an element carrying an interactive ARIA
 * `role`. A click on cell text, the gaps between cells, or the listening element
 * itself reports `false`.
 *
 * The table's own row activation, row-click selection and sort headers use this definition
 * to leave a click or `Enter` to the inner control that owns it; call it from a row listener
 * of your own to skip the same events.
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
