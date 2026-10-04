import { accessibleTextContent } from '../accessible-text/accessible-text';

/**
 * The name every drag and reorder announcement calls an item by: the trimmed accessible text of
 * `node`, excluding any `aria-hidden` subtree such as a decorative `[forDragHandle]` glyph and
 * keeping visually-hidden but announced content.
 */
export function dragAnnouncementLabel(node: Node): string {
  return accessibleTextContent(node).trim();
}
