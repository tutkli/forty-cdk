import { afterEveryRender, DestroyRef, DOCUMENT, ElementRef, inject } from '@angular/core';

import { resolveActiveElement } from '../composed-tree/composed-tree';
import type { RovingTabindex } from './roving-tabindex';

/**
 * Keeps DOM focus inside a roving group whose focused element leaves it. When a
 * render detaches the element that held DOM focus inside the group's host while
 * focus has fallen to `<body>`, focus moves to the host the tracker re-seeded to.
 * An element that did not hold focus when it left moves nothing, whatever the
 * tracker's pointer says, and focus anywhere else is left alone, so a consumer
 * control that removed or collapsed the item keeps it, and so does a targeted
 * focus move another render hook makes in the same render (a keyboard drop
 * focusing the moved node).
 *
 * Pair it with a tracker built with `fallback: 'nearest'`, so the new owner is
 * the item beside the one that left rather than the first in the group. Call it
 * in the injection context of the group's host directive; it moves no focus
 * during a server render.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function injectRovingFocusRestore(roving: RovingTabindex): void {
  const document = inject(DOCUMENT);
  const root = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  let held: Element | null = null;

  const onFocusIn = (event: FocusEvent): void => {
    held = event.target instanceof Element ? event.target : null;
  };
  const onFocusOut = (event: FocusEvent): void => {
    const target = event.target;
    queueMicrotask(() => {
      if (held !== null && held === target && held.isConnected) {
        held = null;
      }
    });
  };
  const controller = new AbortController();
  root.addEventListener('focusin', onFocusIn, { signal: controller.signal });
  root.addEventListener('focusout', onFocusOut, { signal: controller.signal });
  inject(DestroyRef).onDestroy(() => controller.abort());

  afterEveryRender(() => {
    const departed = held;
    if (departed === null || departed.isConnected) {
      return;
    }
    held = null;
    const active = roving.active();
    if (active === null) {
      return;
    }
    queueMicrotask(() => {
      const focused = resolveActiveElement(document);
      const lost =
        focused === null || focused === document.body || focused === document.documentElement;
      if (lost && active.isConnected && roving.active() === active) {
        active.focus();
      }
    });
  });
}
