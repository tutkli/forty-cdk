/**
 * Concatenate the accessible text of a DOM node, excluding any subtree marked
 * `aria-hidden="true"`. Mirrors how assistive technology derives an accessible
 * name from text content: an `aria-hidden` element (a decorative indicator
 * glyph, badge, icon, …) contributes nothing, while visually-hidden but
 * announced content (`hidden` / `display:none` are NOT skipped here) is kept.
 *
 * This is the definition the library itself reasons about: the label a
 * `[forSelectOption]` / `[forComboboxOption]` reports, the text its typeahead
 * matches on, and the name a reorder announcement uses. Read it through this
 * function rather than through `textContent` so a decorative glyph inside an
 * option cannot make the two disagree.
 *
 * The result is returned untrimmed, so apply your own `.trim()` when comparing.
 * SSR-safe: it touches no `document` / `window` and branches on the node's own
 * `nodeType` constants.
 *
 * @param node The DOM node whose accessible text to read (typically an option host).
 * @returns The concatenated text of all non-`aria-hidden` descendant text nodes.
 */
export function accessibleTextContent(node: Node): string {
  let text = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === child.TEXT_NODE) {
      text += child.nodeValue ?? '';
      return;
    }
    if (child.nodeType === child.ELEMENT_NODE) {
      if ((child as Element).getAttribute('aria-hidden') === 'true') {
        return;
      }
      text += accessibleTextContent(child);
    }
  });
  return text;
}
