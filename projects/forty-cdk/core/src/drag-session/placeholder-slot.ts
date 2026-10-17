const SLOT_LAYOUT_PROPERTIES = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset-block-start',
  'inset-block-end',
  'inset-inline-start',
  'inset-inline-end',
  'width',
  'height',
  'transform',
  'translate',
] as const;

/**
 * Places the `[forDragPlaceholder]` root nodes in the slot of the out-of-flow `lifted` item by
 * copying each inline position, inset, size and transform declaration the item carries. A
 * declaration the item leaves unset keeps the placeholder's own value, so a template that sizes
 * itself keeps its height. Non-element nodes are skipped.
 */
export function layoutPlaceholderInSlot(nodes: readonly Node[], lifted: HTMLElement): void {
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    for (const property of SLOT_LAYOUT_PROPERTIES) {
      const value = lifted.style.getPropertyValue(property);
      if (value !== '') {
        node.style.setProperty(property, value);
      }
    }
  }
}
