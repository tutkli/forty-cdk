import { type Type } from '@angular/core';

import { flush } from './flush';
import { renderHost, type RenderResult } from './render';

/**
 * The result of {@link mountOverlay} — extends {@link RenderResult} with the
 * portaled `content` element queried after the overlay opened.
 */
export interface MountOverlayResult<T, C extends HTMLElement = HTMLElement>
  extends RenderResult<T> {
  /** The portaled content element, queried from `document` after open + flush. */
  content: C;
}

/**
 * Common overlay-spec scaffolding: render the host, run a caller-supplied
 * `open(instance)` callback (typically `instance.open.set(true)`), drain the
 * render pipeline, and return the portaled content element along with the
 * usual {@link RenderResult} bag.
 *
 * Throws if no element matches `contentSelector` after the open + flush —
 * which usually means the directive failed to portal the content, the
 * selector is wrong, or the open signal didn't propagate.
 *
 * Example:
 *
 *   const r = await mountOverlay(PopoverHost, {
 *     open: (h) => h.open.set(true),
 *     contentSelector: '[forPopoverContent]',
 *   });
 *   expect(r.content.getAttribute('role')).toBe('dialog');
 */
export async function mountOverlay<T, C extends HTMLElement = HTMLElement>(
  host: Type<T>,
  options: {
    open: (instance: T) => void;
    contentSelector: string;
  },
): Promise<MountOverlayResult<T, C>> {
  const r = renderHost(host);
  options.open(r.instance);
  await flush(r.fixture);
  const content = document.querySelector<C>(options.contentSelector);
  if (!content) {
    throw new Error(
      `[forty-cdk/test-utils] mountOverlay: no element matched "${options.contentSelector}" after open + flush. ` +
        `Either the overlay didn't portal yet (consider awaiting another flush) or the selector is wrong.`,
    );
  }
  return { ...r, content };
}
