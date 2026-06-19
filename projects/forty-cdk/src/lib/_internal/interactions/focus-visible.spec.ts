import { Component, PLATFORM_ID, type Signal, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectFocusVisible } from './focus-visible';

@Component({ template: `` })
class Host {
  readonly focusVisible: Signal<boolean> = injectFocusVisible();
}

describe('injectFocusVisible', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('is false before any interaction', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    expect(fixture.componentInstance.focusVisible()).toBe(false);
  });

  it('is true after keyboard interaction and false after pointer interaction', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(fixture.componentInstance.focusVisible()).toBe(true);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(fixture.componentInstance.focusVisible()).toBe(false);
  });

  it('shares one signal across consumers in the same injector', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const a = TestBed.createComponent(Host);
    const b = TestBed.createComponent(Host);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(a.componentInstance.focusVisible()).toBe(true);
    expect(b.componentInstance.focusVisible()).toBe(true);
  });

  it('stays false on the server', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(Host);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(fixture.componentInstance.focusVisible()).toBe(false);
  });
});
