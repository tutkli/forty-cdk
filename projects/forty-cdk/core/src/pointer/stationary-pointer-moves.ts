import { DOCUMENT, inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StationaryPointerMoves {
  readonly #document = inject(DOCUMENT);
  readonly #verdicts = new WeakMap<Event, boolean>();
  #controller: AbortController | null = null;
  #users = 0;
  #pointerId = -1;
  #x = Number.NaN;
  #y = Number.NaN;
  #scrolled = false;

  acquire(): () => void {
    if (this.#users === 0) {
      this.#listen();
    }
    this.#users += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      this.#users -= 1;
      if (this.#users === 0) {
        this.#controller?.abort();
        this.#controller = null;
      }
    };
  }

  isStationary(event: PointerEvent): boolean {
    const known = this.#verdicts.get(event);
    if (known !== undefined) {
      return known;
    }
    const stationary =
      this.#scrolled &&
      event.pointerId === this.#pointerId &&
      event.clientX === this.#x &&
      event.clientY === this.#y;
    this.#verdicts.set(event, stationary);
    this.#scrolled = false;
    this.#pointerId = event.pointerId;
    this.#x = event.clientX;
    this.#y = event.clientY;
    return stationary;
  }

  #listen(): void {
    this.#controller = new AbortController();
    this.#pointerId = -1;
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#scrolled = false;
    this.#document.addEventListener(
      'scroll',
      () => {
        this.#scrolled = true;
      },
      { capture: true, passive: true, signal: this.#controller.signal },
    );
  }
}
