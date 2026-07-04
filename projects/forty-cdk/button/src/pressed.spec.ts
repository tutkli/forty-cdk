import {
  Component,
  PLATFORM_ID,
  type Signal,
  type WritableSignal,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectPressed } from './pressed';

@Component({ template: `` })
class Host {
  readonly disabled: WritableSignal<boolean> = signal(false);
  readonly pressed: Signal<boolean> = injectPressed({ disabled: this.disabled });
}

function down(el: HTMLElement, init: PointerEventInit = {}): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', ...init }));
}
function up(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerType: 'mouse' }));
}

describe('injectPressed', () => {
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
    expect(host.pressed()).toBe(false);
  });

  it('sets on pointerdown and clears on pointerup', () => {
    const { host, el } = render();
    down(el);
    expect(host.pressed()).toBe(true);
    up(el);
    expect(host.pressed()).toBe(false);
  });

  it('clears when the pointer leaves the element mid-press', () => {
    const { host, el } = render();
    down(el);
    expect(host.pressed()).toBe(true);
    el.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(host.pressed()).toBe(false);
  });

  it('ignores non-primary mouse buttons', () => {
    const { host, el } = render();
    down(el, { button: 2 });
    expect(host.pressed()).toBe(false);
  });

  it('sets on Enter / Space keydown and clears on keyup', () => {
    const { host, el } = render();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(host.pressed()).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(host.pressed()).toBe(false);

    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(host.pressed()).toBe(true);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
    expect(host.pressed()).toBe(false);
  });

  it('ignores other keys', () => {
    const { host, el } = render();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(host.pressed()).toBe(false);
  });

  it('clears on blur while a key is held', () => {
    const { host, el } = render();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(host.pressed()).toBe(true);
    el.dispatchEvent(new FocusEvent('blur'));
    expect(host.pressed()).toBe(false);
  });

  it('never arms while disabled and short-circuits an active press reactively', () => {
    const { host, el } = render();
    host.disabled.set(true);
    down(el);
    expect(host.pressed()).toBe(false);

    host.disabled.set(false);
    down(el);
    expect(host.pressed()).toBe(true);
    host.disabled.set(true);
    expect(host.pressed()).toBe(false);
  });

  it('removes its listeners on destroy', () => {
    const { host, el, destroy } = render();
    destroy();
    down(el);
    expect(host.pressed()).toBe(false);
  });

  it('is a no-op on the server', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement as HTMLElement;
    down(el);
    expect(fixture.componentInstance.pressed()).toBe(false);
  });
});
