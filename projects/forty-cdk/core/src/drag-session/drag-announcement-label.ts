/**
 * The name every drag and reorder announcement calls an item by, resolved like an accessible
 * name: a non-empty `override` (a `[textValue]`), else the text of the elements the node's
 * `aria-labelledby` references, else its `aria-label`, else its descendant text. Descendant text
 * skips any `aria-hidden` subtree such as a decorative `[forDragHandle]` glyph, keeps
 * visually-hidden but announced content, reads a descendant's own `aria-label` in place of its
 * content, and puts a space between element children so adjacent elements are not run together.
 * Whitespace is collapsed and trimmed. SSR-safe: it reads no global `document`.
 */
export function dragAnnouncementLabel(node: Element, override?: string | null): string {
  const explicit = override?.trim();
  if (explicit) {
    return explicit;
  }
  return dragElementName(node) || collapse(spacedText(node));
}

/**
 * The name `node` is given by `aria-labelledby` (the referenced elements' text, joined with
 * spaces) or, failing that, by `aria-label`; `''` when it declares neither. It never falls back
 * to descendant text, so a drop list is not named after the items it holds.
 */
export function dragElementName(node: Element): string {
  const ids = node.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
  const referenced = collapse(
    ids
      .map((id) => referencedElement(node, id))
      .map((el) => (el === null ? '' : (explicitLabel(el) ?? spacedText(el))))
      .join(' '),
  );
  return referenced || (explicitLabel(node) ?? '');
}

function referencedElement(node: Element, id: string): Element | null {
  const root = node.getRootNode();
  const scope = 'getElementById' in root ? (root as Document | DocumentFragment) : null;
  return (scope ?? node.ownerDocument).getElementById(id);
}

function explicitLabel(el: Element): string | null {
  const label = el.getAttribute('aria-label')?.trim();
  return label ? label : null;
}

function spacedText(node: Node): string {
  let text = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === child.TEXT_NODE) {
      text += child.nodeValue ?? '';
      return;
    }
    if (child.nodeType !== child.ELEMENT_NODE) {
      return;
    }
    const el = child as Element;
    if (el.getAttribute('aria-hidden') === 'true') {
      return;
    }
    text += ` ${explicitLabel(el) ?? spacedText(el)} `;
  });
  return text;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
