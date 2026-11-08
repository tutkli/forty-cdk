import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  inject,
  PLATFORM_ID,
  type Signal,
  signal,
} from '@angular/core';

import { overflowScrolls } from '../swipe-dismiss/scroll-boundary';

/** A `touch-action` value a drag surface or handle binds; `null` leaves the browser default. */
export type DragTouchAction = 'none' | 'pan-x' | 'pan-y' | null;

/** One flag per axis. */
export interface DragAxes {
  /** The horizontal axis. */
  readonly x: boolean;
  /** The vertical axis. */
  readonly y: boolean;
}

/** Both axes set: a free drag, or a reorder whose list may lie either way. */
export const BOTH_DRAG_AXES: DragAxes = { x: true, y: true };

/** Neither axis set: a host that scrolls on no axis. */
export const NO_DRAG_AXES: DragAxes = { x: false, y: false };

/** The inputs every drag surface's `touch-action` is computed from. */
export interface DragSurfaceTouchActionInput {
  /** Whether a press on the surface can currently arm the drag. */
  readonly armable: boolean;
  /** Whether handles are registered, so the drag arms only from a handle and never from the surface. */
  readonly handles: boolean;
  /** The axes the gesture moves along, on which the browser must not pan. */
  readonly axes: DragAxes;
  /** The axes on which the host itself is a scroll container that currently overflows. */
  readonly hostScrolls: DragAxes;
}

/**
 * The `touch-action` a drag surface binds. The browser keeps panning on every axis the gesture does
 * not move along, and on every axis the host scrolls on by itself, so a scroll container that is
 * also a drag surface still scrolls by touch. `null` while the surface cannot arm, or while handles
 * are registered, since each handle then carries {@link dragHandleTouchAction}.
 */
export function dragSurfaceTouchAction(input: DragSurfaceTouchActionInput): DragTouchAction {
  if (!input.armable || input.handles) {
    return null;
  }
  const x = input.axes.x && !input.hostScrolls.x;
  const y = input.axes.y && !input.hostScrolls.y;
  if (x && y) {
    return 'none';
  }
  if (x) {
    return 'pan-y';
  }
  return y ? 'pan-x' : null;
}

/**
 * The `touch-action` a drag handle binds: `'none'` while the drag can arm, so a touch drag on the
 * handle is not taken by the page's scrolling, else `null`.
 */
export function dragHandleTouchAction(armable: boolean): 'none' | null {
  return armable ? 'none' : null;
}

function measureScrollAxes(host: HTMLElement): DragAxes {
  const style = host.ownerDocument.defaultView?.getComputedStyle(host);
  return {
    x: overflowScrolls(style?.overflowX ?? '') && host.scrollWidth > host.clientWidth,
    y: overflowScrolls(style?.overflowY ?? '') && host.scrollHeight > host.clientHeight,
  };
}

/**
 * The axes on which `host` is a scroll container whose content overflows it, kept current while
 * the host or one of its children resizes and while children are added or removed. The browser
 * fixes a touch's `touch-action` when the touch starts, so a surface reads this ahead of the press
 * rather than measuring at `pointerdown`. A change to the host's `overflow` style with no resize is
 * seen on the next resize. {@link NO_DRAG_AXES} on the server and until the first render.
 *
 * Call from an injection context.
 */
export function injectHostScrollAxes(host: HTMLElement): Signal<DragAxes> {
  const out = signal<DragAxes>(NO_DRAG_AXES);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return out.asReadonly();
  }

  let prev = NO_DRAG_AXES;
  const sync = (): void => {
    const next = measureScrollAxes(host);
    if (next.x !== prev.x || next.y !== prev.y) {
      prev = next;
      out.set(next);
    }
  };

  let resize: ResizeObserver | null = null;
  let mutation: MutationObserver | null = null;
  const observeChildren = (): void => {
    if (!resize) {
      return;
    }
    resize.disconnect();
    resize.observe(host);
    for (const child of Array.from(host.children)) {
      resize.observe(child);
    }
  };

  afterNextRender(() => {
    sync();
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(sync);
      observeChildren();
    }
    if (typeof MutationObserver !== 'undefined') {
      mutation = new MutationObserver(() => {
        observeChildren();
        sync();
      });
      mutation.observe(host, { childList: true });
    }
  });

  inject(DestroyRef).onDestroy(() => {
    resize?.disconnect();
    mutation?.disconnect();
  });

  return out.asReadonly();
}
