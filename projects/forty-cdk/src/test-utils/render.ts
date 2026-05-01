import { provideZonelessChangeDetection, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

export interface RenderResult<T> {
  fixture: ComponentFixture<T>;
  instance: T;
  el: HTMLElement;
  query: <E extends Element = HTMLElement>(selector: string) => E | null;
  queryAll: <E extends Element = HTMLElement>(selector: string) => E[];
  flush: () => void;
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
    flush: () => fixture.detectChanges(),
  };
}
