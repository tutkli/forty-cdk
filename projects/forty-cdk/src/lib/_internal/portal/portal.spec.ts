import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, nextMacrotask } from '../../../test-utils';
import { injectPortal } from './portal';

@Component({
  selector: 'portaled-bubble',
  template: '<ng-content />',
})
class PortaledBubble {
  constructor() {
    injectPortal();
  }
}

@Component({
  imports: [PortaledBubble],
  template: `
    <div id="parent">
      <portaled-bubble>portaled</portaled-bubble>
    </div>
  `,
})
class PortalHost {}

@Component({
  selector: 'targeted-bubble',
  template: '<ng-content />',
})
class TargetedBubble {
  constructor() {
    injectPortal({ target: document.getElementById('custom-target')! });
  }
}

@Component({
  selector: 'lazy-target-bubble',
  template: '<ng-content />',
})
class LazyTargetBubble {
  constructor() {
    injectPortal({ target: () => document.getElementById('custom-target') as HTMLElement | null });
  }
}

@Component({
  imports: [LazyTargetBubble],
  template: `
    <div id="parent">
      <lazy-target-bubble>lazy</lazy-target-bubble>
    </div>
  `,
})
class LazyTargetHost {}

@Component({
  imports: [TargetedBubble],
  template: `
    <div id="parent">
      <targeted-bubble>targeted</targeted-bubble>
    </div>
  `,
})
class CustomTargetHost {}

describe('injectPortal', () => {
  afterEach(() => {
    // Stray `#custom-target` is a manually-appended container — not portaled,
    // not covered by Angular destroy hooks. Bubbles themselves should clean
    // themselves up via the directive's destroy hook; if any survive, that's
    // a leak and the assertions below should be the ones that fail.
    document.querySelectorAll('#custom-target').forEach((n) => n.remove());
  });

  it('moves the host element to document.body after first render', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);

    const parent = fixture.nativeElement.querySelector('#parent');
    const portaled = document.querySelector('portaled-bubble')!;

    expect(portaled.parentElement).toBe(document.body);
    expect(parent.contains(portaled)).toBe(false);
  });

  it('removes the portaled element on destroy', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);

    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(1);
    fixture.destroy();
    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(0);
  });

  it('defers removal until in-flight animations finish when getAnimations is present', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);

    const portaled = document.querySelector<HTMLElement>('portaled-bubble')!;

    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    portaled.getAnimations = (() => [
      { finished } as unknown as Animation,
    ]) as HTMLElement['getAnimations'];
    const rafSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });

    try {
      fixture.destroy();
      expect(document.querySelectorAll('portaled-bubble')).toHaveLength(1);

      resolveFinished();
      await nextMacrotask();
      expect(document.querySelectorAll('portaled-bubble')).toHaveLength(0);
    } finally {
      rafSpy.mockRestore();
      document.querySelectorAll('portaled-bubble').forEach((n) => n.remove());
    }
  });

  it('honors a custom target container', async () => {
    const target = document.createElement('div');
    target.id = 'custom-target';
    document.body.appendChild(target);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(CustomTargetHost);
    await flush(fixture);

    const portaled = document.querySelector('targeted-bubble')!;
    expect(portaled.parentElement).toBe(target);
  });

  it('resolves a function target lazily and portals to it', async () => {
    const target = document.createElement('div');
    target.id = 'custom-target';
    document.body.appendChild(target);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(LazyTargetHost);
    await flush(fixture);

    const portaled = document.querySelector('lazy-target-bubble')!;
    expect(portaled.parentElement).toBe(target);
  });

  it('is idempotent: re-rendering does not move the element again', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    await flush(fixture);
    await flush(fixture);

    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(1);
  });

  it('does not leak when the host is destroyed before the queued render fires', async () => {
    // Reproduces the failure mode that motivated the spec-side
    // `afterEach(() => document.querySelectorAll(...).forEach(remove))`
    // pattern: if the directive is torn down between construction and the
    // first `afterNextRender` callback, the queued `appendChild` must NOT
    // re-attach the element to `target` after the destroy hook ran.
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(PortalHost);
    fixture.detectChanges();

    // Destroy synchronously — before the macrotask hop that lets
    // `afterNextRender` callbacks run. This is the path SPA navigations and
    // synchronous test teardowns hit.
    fixture.destroy();

    // Drain any queued render/macrotask work that might have escaped the
    // destroy. Without the cancellation in `injectPortal`, `appendChild`
    // would fire here and leak the element into `document.body`.
    await nextMacrotask();

    expect(document.querySelectorAll('portaled-bubble')).toHaveLength(0);
  });
});
