import { composedParentElement, type DragRect } from 'forty-cdk/core';

export interface ClippingAncestor {
  readonly el: HTMLElement;
  readonly x: boolean;
  readonly y: boolean;
}

export function findClippingAncestors(host: HTMLElement, win: Window): readonly ClippingAncestor[] {
  const doc = win.document;
  const clippers: ClippingAncestor[] = [];
  let position = win.getComputedStyle(host).position;
  for (
    let el = composedParentElement(host);
    el !== null && el !== doc.body && el !== doc.documentElement;
    el = composedParentElement(el)
  ) {
    if (position === 'fixed') {
      break;
    }
    const style = win.getComputedStyle(el);
    if (position === 'absolute' && style.position === 'static') {
      continue;
    }
    position = style.position;
    const x = style.overflowX !== 'visible';
    const y = style.overflowY !== 'visible';
    if (x || y) {
      clippers.push({ el, x, y });
    }
  }
  return clippers;
}

export function clipRegion(clippers: readonly ClippingAncestor[]): DragRect | undefined {
  if (clippers.length === 0) {
    return undefined;
  }
  let left = -Infinity;
  let top = -Infinity;
  let right = Infinity;
  let bottom = Infinity;
  for (const { el, x, y } of clippers) {
    const rect = el.getBoundingClientRect();
    if (x) {
      left = Math.max(left, rect.left);
      right = Math.min(right, rect.right);
    }
    if (y) {
      top = Math.max(top, rect.top);
      bottom = Math.min(bottom, rect.bottom);
    }
  }
  return { left, top, right, bottom };
}
