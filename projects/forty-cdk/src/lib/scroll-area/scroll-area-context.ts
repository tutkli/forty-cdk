import { inject, InjectionToken, Signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';

export type ForScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';
export type ForScrollbarOrientation = 'horizontal' | 'vertical';

export interface ForScrollAreaContext {
  readonly type: Signal<ForScrollAreaType>;
  readonly scrollHideDelay: Signal<number>;
  readonly dir: Signal<WritingDirection>;

  /** The scrolling element (registered by `ForScrollAreaViewport`). */
  readonly viewport: Signal<HTMLElement | null>;
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
