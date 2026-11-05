import { Injectable } from '@angular/core';

import { composedParentElement } from '../composed-tree/composed-tree';

@Injectable({ providedIn: 'root' })
export class ReturnFocusResolver {
  readonly #fallbacks = new WeakMap<Element, () => HTMLElement | null>();

  recordRemoval(removed: Element, fallback: () => HTMLElement | null): void {
    this.#fallbacks.set(removed, fallback);
  }

  resolve(...candidates: readonly (HTMLElement | null)[]): HTMLElement | null {
    const present = candidates.filter((candidate): candidate is HTMLElement => candidate !== null);
    const connected = present.find((candidate) => candidate.isConnected);
    if (connected !== undefined) {
      return connected;
    }
    for (const candidate of present) {
      const fallback = this.#fallbackFor(candidate);
      if (fallback?.isConnected) {
        return fallback;
      }
    }
    return null;
  }

  #fallbackFor(target: HTMLElement): HTMLElement | null {
    for (let node: Element | null = target; node !== null; node = composedParentElement(node)) {
      const fallback = this.#fallbacks.get(node);
      if (fallback !== undefined) {
        return fallback();
      }
    }
    return null;
  }
}
