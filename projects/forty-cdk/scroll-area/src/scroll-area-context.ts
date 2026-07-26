import { inject, InjectionToken, type Signal } from '@angular/core';

import { type WritingDirection } from 'forty-cdk/core';

export type ForScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';
export type ForScrollbarOrientation = 'horizontal' | 'vertical';

/**
 * What a primary-button press on bare scrollbar track does:
 * - `'page'` — step one page toward the press and auto-repeat while held,
 *   stopping when the thumb reaches the pointer (platform default).
 * - `'jump'` — centre the thumb on the press point, then scrub while held.
 * - `'none'` — the library ignores track presses entirely.
 */
export type ForScrollAreaTrackPress = 'none' | 'page' | 'jump';

export interface ForScrollAreaContext {
  readonly type: Signal<ForScrollAreaType>;
  readonly scrollHideDelay: Signal<number>;
  readonly dir: Signal<WritingDirection>;
  /** Behaviour of a primary-button press on bare scrollbar track. */
  readonly trackPress: Signal<ForScrollAreaTrackPress>;
  /** ms a `trackPress="page"` hold waits before the first auto-repeat step. */
  readonly trackPressRepeatDelay: Signal<number>;
  /** ms between auto-repeat steps of a held `trackPress="page"` gesture. */
  readonly trackPressRepeatInterval: Signal<number>;

  /** The scrolling element (registered by `ForScrollAreaViewport`). */
  readonly viewport: Signal<HTMLElement | null>;
  /** The content element (registered by `ForScrollAreaContent`, observed by the viewport). */
  readonly content: Signal<HTMLElement | null>;
  /** Live scroll offset of the viewport. */
  readonly scrollLeft: Signal<number>;
  readonly scrollTop: Signal<number>;
  /** Live size measurements of the viewport. */
  readonly clientWidth: Signal<number>;
  readonly clientHeight: Signal<number>;
  readonly scrollWidth: Signal<number>;
  readonly scrollHeight: Signal<number>;

  /** True while the user is hovering anywhere on the root (for `type="hover"`). */
  readonly hovering: Signal<boolean>;
  /** True for a short window after the most recent scroll (for `type="scroll"`). */
  readonly scrolling: Signal<boolean>;

  registerViewport(el: HTMLElement | null): void;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  reportScroll(left: number, top: number): void;
  reportSize(clientW: number, clientH: number, scrollW: number, scrollH: number): void;
  noteUserScroll(): void;
}

export const FOR_SCROLL_AREA_CONTEXT = new InjectionToken<ForScrollAreaContext>(
  'FOR_SCROLL_AREA_CONTEXT',
);

export function injectScrollAreaContext(piece: string): ForScrollAreaContext {
  const ctx = inject(FOR_SCROLL_AREA_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/scroll-area] ${piece} must be used inside a [forScrollArea] element.`,
    );
  }
  return ctx;
}
