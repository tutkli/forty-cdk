import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InputModality } from './modality';

const isCapture = (options: boolean | EventListenerOptions | undefined): boolean =>
  typeof options === 'boolean' ? options : options?.capture === true;

describe('InputModality', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts as not-keyboard before any interaction', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);
    expect(modality.keyboard()).toBe(false);
  });

  it('flips to keyboard on keydown and back to pointer on pointerdown', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(modality.keyboard()).toBe(true);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(modality.keyboard()).toBe(false);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    expect(modality.keyboard()).toBe(true);
  });

  it('ignores modifier shortcuts (Ctrl / Meta / Alt) so keyboard stays false during mouse use', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(modality.keyboard()).toBe(false);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'c', ctrlKey: true }),
    );
    expect(modality.keyboard()).toBe(false);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'c', metaKey: true }),
    );
    expect(modality.keyboard()).toBe(false);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown', altKey: true }),
    );
    expect(modality.keyboard()).toBe(false);
  });

  it('treats Shift alone as keyboard navigation (Shift+Tab)', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(modality.keyboard()).toBe(false);

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Tab', shiftKey: true }),
    );
    expect(modality.keyboard()).toBe(true);
  });

  it('listens on the capture phase so it settles before content can stop propagation', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);

    const child = document.createElement('div');
    document.body.appendChild(child);
    child.addEventListener('keydown', (event) => event.stopPropagation());
    try {
      child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      expect(modality.keyboard()).toBe(true);
    } finally {
      child.remove();
    }
  });

  it('installs exactly one keydown + one pointerdown capture listener regardless of consumers', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const addSpy = vi.spyOn(document, 'addEventListener');

    const first = TestBed.inject(InputModality);
    const second = TestBed.inject(InputModality);
    expect(second).toBe(first);

    const captureKeydown = addSpy.mock.calls.filter(
      ([type, , options]) => type === 'keydown' && isCapture(options),
    );
    const capturePointerdown = addSpy.mock.calls.filter(
      ([type, , options]) => type === 'pointerdown' && isCapture(options),
    );
    expect(captureKeydown).toHaveLength(1);
    expect(capturePointerdown).toHaveLength(1);
  });

  it('stops responding to document events once the injector is destroyed', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const modality = TestBed.inject(InputModality);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(modality.keyboard()).toBe(true);

    TestBed.resetTestingModule();

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(modality.keyboard()).toBe(true);
  });

  it('is a no-op on the server: stays false and installs no document listener', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const addSpy = vi.spyOn(document, 'addEventListener');
    const modality = TestBed.inject(InputModality);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(modality.keyboard()).toBe(false);

    const installed = addSpy.mock.calls.filter(
      ([type]) => type === 'keydown' || type === 'pointerdown',
    );
    expect(installed).toHaveLength(0);
  });
});
