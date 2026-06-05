import { provideZonelessChangeDetection, type Type } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { flush } from './flush';

export interface RenderResult<T> {
  fixture: ComponentFixture<T>;
  instance: T;
  el: HTMLElement;
  query: <E extends Element = HTMLElement>(selector: string) => E | null;
  queryAll: <E extends Element = HTMLElement>(selector: string) => E[];
  /**
   * The canonical {@link flush} waiter bound to this fixture. `await` it to
   * drain Angular's render pipeline (including `afterNextRender` callbacks),
   * exactly like `await flush(fixture)`. It is the same async implementation —
   * not a synchronous `detectChanges()` shadow.
   */
  flush: () => Promise<void>;
}

/**
 * Mounts a host component in a TestBed configured for zoneless change
 * detection. Each spec defines its own tiny standalone host (with whatever
 * signals it needs) and passes it in.
 *
 * Not exported from `public-api.ts` — internal to forty-cdk's test suite.
 */
export function renderHost<T>(host: Type<T>): RenderResult<T> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });

  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();

  const root = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    instance: fixture.componentInstance,
    el: root,
    query: <E extends Element = HTMLElement>(selector: string) =>
      root.querySelector<E>(selector),
    queryAll: <E extends Element = HTMLElement>(selector: string) =>
      Array.from(root.querySelectorAll<E>(selector)),
    flush: () => flush(fixture),
  };
}
