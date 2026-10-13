import { Injectable } from '@angular/core';

import { composedParentElement } from 'forty-cdk/core';

@Injectable({ providedIn: 'root' })
export class ModalActivationOrder {
  readonly #held = new Map<HTMLElement, (() => void)[]>();

  hold(host: HTMLElement): void {
    this.#held.set(host, []);
  }

  enclosingHeld(node: Element | null): HTMLElement | null {
    let cursor: Element | null = node;
    while (cursor !== null) {
      if (cursor instanceof HTMLElement && this.#held.has(cursor)) {
        return cursor;
      }
      cursor = composedParentElement(cursor);
    }
    return null;
  }

  after(enclosing: HTMLElement | null, activate: () => void): void {
    const queue = enclosing === null ? undefined : this.#held.get(enclosing);
    if (queue === undefined) {
      activate();
    } else {
      queue.push(activate);
    }
  }

  release(host: HTMLElement): void {
    const queue = this.#held.get(host);
    if (queue === undefined) {
      return;
    }
    this.#held.delete(host);
    for (const activate of queue) {
      activate();
    }
  }
}
