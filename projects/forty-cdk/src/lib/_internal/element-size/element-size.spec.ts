import {
  Component,
  type ElementRef,
  inject,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../test-utils';
import { injectElementSize } from './element-size';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element | null = null;
  constructor(public cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.observed = el;
  }
  disconnect(): void {
    this.observed = null;
  }
  unobserve(): void {
    this.observed = null;
  }
  /** Trigger the callback as the browser would on resize. */
  fire(): void {
    if (!this.observed) return;
    // The shape passed to consumers doesn't matter for our wrapper.
    this.cb([], this as unknown as ResizeObserver);
  }
}

@Component({
  selector: 'host-cmp',
  template: `<div #box style="display:block"></div>`,
})
class Host {
  readonly target = signal<HTMLElement | null>(null);
  readonly size = injectElementSize(this.target);
  readonly box = viewChild.required<ElementRef<HTMLDivElement>>('box');

  attach(): void {
    this.target.set(this.box().nativeElement);
  }
}

describe('injectElementSize', () => {
  let hadRO: boolean;
  let originalRO: typeof ResizeObserver | undefined;

  beforeEach(() => {
    hadRO = 'ResizeObserver' in globalThis;
    originalRO = globalThis.ResizeObserver;

    (globalThis as any).ResizeObserver = FakeResizeObserver as any;
    FakeResizeObserver.instances = [];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });
  afterEach(() => {
    if (hadRO) {
      (globalThis as any).ResizeObserver = originalRO;
    } else {
      delete (globalThis as any).ResizeObserver;
    }
  });

  it('returns null until a target is set', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toBeNull();
  });

  it('measures the target after attach and fires on resize', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const div = fixture.componentInstance.box().nativeElement;
    Object.defineProperty(div, 'clientWidth', { configurable: true, value: 200 });
    Object.defineProperty(div, 'clientHeight', { configurable: true, value: 50 });
    Object.defineProperty(div, 'scrollWidth', { configurable: true, value: 400 });
    Object.defineProperty(div, 'scrollHeight', { configurable: true, value: 50 });

    fixture.componentInstance.attach();
    await flush(fixture);

    expect(fixture.componentInstance.size()).toEqual({
      width: 200,
      height: 50,
      scrollWidth: 400,
      scrollHeight: 50,
    });

    // Simulate a resize.
    Object.defineProperty(div, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(div, 'scrollWidth', { configurable: true, value: 800 });
    FakeResizeObserver.instances.at(-1)!.fire();
    fixture.detectChanges();

    expect(fixture.componentInstance.size()).toEqual({
      width: 300,
      height: 50,
      scrollWidth: 800,
      scrollHeight: 50,
    });
  });

  it('disconnects the observer when the target turns null', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.attach();
    fixture.detectChanges();

    const ro = FakeResizeObserver.instances.at(-1)!;
    expect(ro.observed).not.toBeNull();

    fixture.componentInstance.target.set(null);
    fixture.detectChanges();

    expect(ro.observed).toBeNull();
    expect(fixture.componentInstance.size()).toBeNull();
  });
});
