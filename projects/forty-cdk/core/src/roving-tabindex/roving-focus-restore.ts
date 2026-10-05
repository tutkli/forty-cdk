import { afterEveryRender, DOCUMENT, inject } from '@angular/core';

import { resolveActiveElement } from '../composed-tree/composed-tree';
import type { RovingTabindex } from './roving-tabindex';

/**
 * Keeps DOM focus inside a roving group whose focused item leaves it. When a
 * render detaches the active host while focus has fallen to `<body>`, focus
 * moves to the host the tracker re-seeded to. Focus anywhere else is left
 * alone, so a consumer control that removed or collapsed the item keeps it, and
 * so does a targeted focus move another render hook makes in the same render
 * (a keyboard drop focusing the moved node).
 *
 * Pair it with a tracker built with `fallback: 'nearest'`, so the new owner is
 * the item beside the one that left rather than the first in the group. Call it
 * in an injection context; it does nothing during a server render.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function injectRovingFocusRestore(roving: RovingTabindex): void {
  const document = inject(DOCUMENT);
  let last: HTMLElement | null = null;
  afterEveryRender(() => {
    const active = roving.active();
    const departed = last;
    last = active;
    if (active === null || departed === null || departed === active || departed.isConnected) {
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
