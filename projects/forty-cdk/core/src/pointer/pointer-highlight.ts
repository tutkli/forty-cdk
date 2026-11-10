import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  type Signal,
  untracked,
} from '@angular/core';

import { KeyedFlag } from '../keyed-flag/keyed-flag';
import { createPointerSuppression } from './pointer-suppression';
import { StationaryPointerMoves } from './stationary-pointer-moves';

export function injectPointerMove(handler: (event: PointerEvent) => void): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const moves = inject(StationaryPointerMoves);
  const release = moves.acquire();
  const controller = new AbortController();
  host.addEventListener(
    'pointermove',
    (event) => {
      if (!moves.isStationary(event)) {
        handler(event);
      }
    },
    { signal: controller.signal },
  );
  inject(DestroyRef).onDestroy(() => {
    controller.abort();
    release();
  });
}

export interface PointerHighlightItem {
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
}

export interface PointerHighlightActiveDescendant {
  readonly active: () => boolean;
  readonly claim: (id: string) => void;
}

export interface PointerHighlightConfig {
  readonly items: () => readonly PointerHighlightItem[];
  readonly activeDescendant?: PointerHighlightActiveDescendant;
}

export interface PointerHighlight {
  readonly pointed: Signal<HTMLElement | null>;
  /**
   * Whether an enabled item is under the pointer. Notifies its readers only
   * when that answer changes, not when the pointer moves between enabled items.
   */
  hasPointed(): boolean;
  /** Whether `host` is the enabled item under the pointer. Reactive per host. */
  isPointed(host: HTMLElement): boolean;
  claim(host: HTMLElement, id?: string): void;
  release(): void;
  suppress(): void;
  isSuppressed(): boolean;
}

export function createPointerHighlight(config: PointerHighlightConfig): PointerHighlight {
  const suppression = createPointerSuppression();
  const host = signal<HTMLElement | null>(null);
  const pointed = computed<HTMLElement | null>(() => {
    const current = host();
    if (current === null) {
      return null;
    }
    const item = config.items().find((candidate) => candidate.host === current);
    return item && !item.disabled() ? current : null;
  });
  const flag = new KeyedFlag<HTMLElement>();
  const epoch = signal(0);
  let tracksItems = false;
  const hasPointed = computed(() => {
    epoch();
    if (tracksItems) {
      for (const item of config.items()) {
        item.disabled();
      }
    }
    return untracked(pointed) !== null;
  });
  const point = (next: HTMLElement | null): void => {
    untracked(() => {
      if (host() === next) {
        return;
      }
      const before = hasPointed();
      flag.move(next);
      host.set(next);
      const subscribes = next !== null && !tracksItems;
      if (subscribes) {
        tracksItems = true;
      }
      if (subscribes || (pointed() !== null) !== before) {
        epoch.update((value) => value + 1);
      }
    });
  };
  return {
    pointed,
    hasPointed,
    isPointed(target: HTMLElement): boolean {
      return flag.has(target) && hasPointed();
    },
    claim(target: HTMLElement, id: string = target.id): void {
      if (suppression.isSuppressed()) {
        return;
      }
      const activeDescendant = config.activeDescendant;
      if (activeDescendant?.active()) {
        activeDescendant.claim(id);
        return;
      }
      point(target);
    },
    release(): void {
      point(null);
    },
    suppress(): void {
      suppression.suppress();
    },
    isSuppressed(): boolean {
      return suppression.isSuppressed();
    },
  };
}
