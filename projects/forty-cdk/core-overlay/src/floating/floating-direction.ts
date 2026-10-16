export function isFloatingRtl(el: Element): boolean {
  return el.ownerDocument.defaultView?.getComputedStyle(el).direction === 'rtl';
}
