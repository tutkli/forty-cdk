import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';

import { createPointerSuppression } from './pointer-suppression';

export function injectPointerMove(handler: (event: PointerEvent) => void): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const controller = new AbortController();
  host.addEventListener('pointermove', handler, { signal: controller.signal });
  inject(DestroyRef).onDestroy(() => controller.abort());
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
  return {
    pointed,
    claim(target: HTMLElement, id: string = target.id): void {
      if (suppression.isSuppressed()) {
        return;
      }
      const activeDescendant = config.activeDescendant;
      if (activeDescendant?.active()) {
        activeDescendant.claim(id);
        return;
      }
      host.set(target);
    },
    release(): void {
      host.set(null);
    },
    suppress(): void {
      suppression.suppress();
    },
    isSuppressed(): boolean {
      return suppression.isSuppressed();
    },
  };
}
