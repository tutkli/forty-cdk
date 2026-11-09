import { inject, InjectionToken, type Signal } from '@angular/core';

import { assertRootContext, orphanContextError, type WritingDirection } from 'forty-cdk/core';
import { type ForScrollAreaTrackPress } from 'forty-cdk/defaults';

export { type ForScrollAreaTrackPress };

export type ForScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';
export type ForScrollbarOrientation = 'horizontal' | 'vertical';

/** Read surface `[forScrollArea]` publishes through {@link FOR_SCROLL_AREA_CONTEXT}. */
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
}

/**
 * The viewport / content / scrollbar registration protocol and the geometry
 * reports the viewport pushes into the root.
 *
 * **Not** part of {@link ForScrollAreaContext} and never exported from
 * `public-api.ts` — only `[forScrollAreaViewport]`, `[forScrollAreaContent]`
 * and `[forScrollAreaScrollbar]` call these members.
 */
export interface ScrollAreaRegistrationContext {
  registerViewport(el: HTMLElement): void;
  unregisterViewport(el: HTMLElement): void;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  reportScroll(left: number, top: number): void;
  reportSize(clientW: number, clientH: number, scrollW: number, scrollH: number): void;
  noteUserScroll(): void;
  registerScrollbar(handle: ScrollAreaScrollbarHandle): void;
  unregisterScrollbar(handle: ScrollAreaScrollbarHandle): void;
}

/** What a mounted `[forScrollAreaScrollbar]` registers with its root. */
export interface ScrollAreaScrollbarHandle {
  readonly orientation: Signal<ForScrollbarOrientation>;
  /** True while a thumb drag or track press pins the track visible. */
  readonly pinned: Signal<boolean>;
}

/**
 * What a piece reads off the root beyond {@link ForScrollAreaContext}.
 *
 * **Not** part of {@link ForScrollAreaContext} and never exported from
 * `public-api.ts` — only `[forScrollAreaCorner]` reads it.
 */
export interface ScrollAreaPieceContext {
  /** Whether a registered scrollbar of `orientation` is pinned by a gesture. */
  scrollbarPinned(orientation: ForScrollbarOrientation): boolean;
}

/**
 * The members `[forScrollAreaThumb]` reaches on its `[forScrollAreaScrollbar]`.
 *
 * Never exported from `public-api.ts`. The thumb reads the scrollbar at this
 * type, so `setDragging` / `registerThumb` / `unregisterThumb` stay TS-`private`
 * on `ForScrollAreaScrollbar` and out of its emitted `.d.ts`.
 */
export interface ScrollbarThumbProtocol {
  readonly orientation: Signal<ForScrollbarOrientation>;
  readonly state: Signal<'visible' | 'hidden'>;
  readonly thumbSize: Signal<number>;
  readonly thumbOffset: Signal<number>;
  readonly usableTrack: Signal<number>;
  readonly maxScroll: Signal<number>;
  readonly scrollPosition: Signal<number>;
  scrollToPosition(position: number): void;
  setDragging(dragging: boolean): void;
  registerThumb(el: HTMLElement): void;
  unregisterThumb(el: HTMLElement): void;
}

/**
 * DI token providing the scroll-area context to descendant pieces.
 *
 * Publicly typed as the read surface {@link ForScrollAreaContext}, which is the whole of
 * what the token promises a consumer. The pieces read the same token at an internal type
 * that adds the viewport / content registration protocol, so a wrapper re-providing it
 * must alias it to the root: `{ provide: FOR_SCROLL_AREA_CONTEXT, useExisting:
 * MyScrollArea }`, where `MyScrollArea` extends `ForScrollArea`. A value that merely
 * satisfies the declared type resolves too, and is rejected in dev mode by the first
 * piece to reach the protocol.
 */
export const FOR_SCROLL_AREA_CONTEXT = new InjectionToken<ForScrollAreaContext>(
  'FOR_SCROLL_AREA_CONTEXT',
);

/**
 * The scroll area's internal coordination surface: everything
 * {@link ForScrollAreaContext} publishes plus the
 * {@link ScrollAreaRegistrationContext} protocol and the
 * {@link ScrollAreaPieceContext} reads.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_SCROLL_AREA_CONTEXT} at, so a consumer who injects that token gets
 * the read surface while the pieces get the wiring protocol. `ForScrollArea`
 * declares the protocol members TS-`private`, which keeps them out of the
 * emitted `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface ScrollAreaContext
  extends ForScrollAreaContext, ScrollAreaRegistrationContext, ScrollAreaPieceContext {}

export function injectScrollAreaContext(piece: string): ScrollAreaContext {
  const ctx = inject(FOR_SCROLL_AREA_CONTEXT, { optional: true }) as ScrollAreaContext | null;
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-SCROLL-AREA-001',
      piece,
      root: '[forScrollArea]',
      token: 'FOR_SCROLL_AREA_CONTEXT',
    });
  }
  assertRootContext({
    entryPoint: 'scroll-area',
    token: 'FOR_SCROLL_AREA_CONTEXT',
    root: '[forScrollArea]',
    piece,
    probe: () => ctx.registerViewport,
  });
  return ctx;
}
