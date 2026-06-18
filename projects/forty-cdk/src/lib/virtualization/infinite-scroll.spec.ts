import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../test-utils';
import { injectInfiniteScroll } from './infinite-scroll';

@Component({ template: '' })
class Host {
  readonly range = signal<readonly [number, number]>([0, 0]);
  readonly count = signal(100);
  readonly disabled = signal(false);
  onLoadMore: () => void | Promise<unknown> = () => {};
  readonly loader = injectInfiniteScroll({
    range: this.range,
    count: this.count,
    disabled: this.disabled,
    onLoadMore: () => this.onLoadMore(),
  });
}

describe('injectInfiniteScroll', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('empty [0, 0] range never fires (SSR-shaped)', async () => {
    const fixture = TestBed.createComponent(Host);
    const spy = vi.fn();
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();
    await flush(fixture);
    expect(spy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loader.pending()).toBe(false);
  });

  it('fires exactly once per crossing — suppresses re-fire while near the end', async () => {
    const fixture = TestBed.createComponent(Host);
    const spy = vi.fn();
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();

    fixture.componentInstance.range.set([0, 10]);
    await flush(fixture);
    expect(spy).not.toHaveBeenCalled();

    fixture.componentInstance.range.set([90, 100]);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);

    fixture.componentInstance.range.set([91, 100]);
    await flush(fixture);
    fixture.componentInstance.range.set([92, 100]);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-arms and fires again after count grows', async () => {
    const fixture = TestBed.createComponent(Host);
    const spy = vi.fn();
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();

    fixture.componentInstance.range.set([90, 100]);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);

    fixture.componentInstance.count.set(101);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('respects disabled — does not fire when disabled, fires when re-enabled', async () => {
    const fixture = TestBed.createComponent(Host);
    const spy = vi.fn();
    fixture.componentInstance.onLoadMore = spy;
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    fixture.componentInstance.range.set([90, 100]);
    await flush(fixture);
    expect(spy).not.toHaveBeenCalled();

    fixture.componentInstance.disabled.set(false);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('suppresses re-fire while a promise is pending; pending reflects in-flight state', async () => {
    const fixture = TestBed.createComponent(Host);
    let resolve!: () => void;
    const p = new Promise<void>((r) => (resolve = r));
    const spy = vi.fn(() => p);
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();

    fixture.componentInstance.range.set([90, 100]);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.loader.pending()).toBe(true);

    fixture.componentInstance.count.set(102);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.loader.pending()).toBe(true);

    resolve();
    await flush(fixture);
    expect(fixture.componentInstance.loader.pending()).toBe(false);

    fixture.componentInstance.count.set(103);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('custom threshold widens the trigger window', async () => {
    @Component({ template: '' })
    class WideHost {
      readonly range = signal<readonly [number, number]>([0, 80]);
      readonly count = signal(100);
      onLoadMore: () => void | Promise<unknown> = () => {};
      readonly loader = injectInfiniteScroll({
        range: this.range,
        count: this.count,
        threshold: 20,
        onLoadMore: () => this.onLoadMore(),
      });
    }

    const spy = vi.fn();
    const fixture = TestBed.createComponent(WideHost);
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fires under zoneless change detection when the window reaches the end', async () => {
    const fixture = TestBed.createComponent(Host);
    const spy = vi.fn();
    fixture.componentInstance.onLoadMore = spy;
    fixture.detectChanges();

    fixture.componentInstance.range.set([90, 100]);
    await flush(fixture);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
