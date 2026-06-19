import {
  Component,
  PLATFORM_ID,
  type Signal,
  type WritableSignal,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectHovered } from './hovered';

@Component({ template: `` })
class Host {
  readonly disabled: WritableSignal<boolean> = signal(false);
  readonly hovered: Signal<boolean> = injectHovered({ disabled: this.disabled });
}

function enter(el: HTMLElement, pointerType = 'mouse'): void {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType }));
}
function leave(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
}

describe('injectHovered', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function render(): { host: Host; el: HTMLElement; destroy: () => void } {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    return {
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
      destroy: () => fixture.destroy(),
    };
  }

  it('is false initially', () => {
    const { host } = render();
    expect(host.hovered()).toBe(false);
  });

  it('sets on mouse pointerenter and clears on pointerleave', () => {
    const { host, el } = render();
    enter(el);
    expect(host.hovered()).toBe(true);
    leave(el);
    expect(host.hovered()).toBe(false);
  });

  it('suppresses the emulated mouse event after touch (touch pointers never hover)', () => {
    const { host, el } = render();
    enter(el, 'touch');
    expect(host.hovered()).toBe(false);
  });

  it('still reports hover for a pen pointer', () => {
    const { host, el } = render();
    enter(el, 'pen');
    expect(host.hovered()).toBe(true);
  });

  it('never arms while disabled and short-circuits an active hover reactively', () => {
    const { host, el } = render();
    host.disabled.set(true);
    enter(el);
    expect(host.hovered()).toBe(false);

    host.disabled.set(false);
    enter(el);
    expect(host.hovered()).toBe(true);
    host.disabled.set(true);
    expect(host.hovered()).toBe(false);
  });

  it('removes its listeners on destroy', () => {
    const { host, el, destroy } = render();
    destroy();
    enter(el);
    expect(host.hovered()).toBe(false);
  });

  it('is a no-op on the server', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement as HTMLElement;
    enter(el);
    expect(fixture.componentInstance.hovered()).toBe(false);
  });
});
