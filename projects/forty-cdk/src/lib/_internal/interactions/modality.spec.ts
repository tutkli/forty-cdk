import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InputModality } from './modality';

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
      ([type, , options]) => type === 'keydown' && options === true,
    );
    const capturePointerdown = addSpy.mock.calls.filter(
      ([type, , options]) => type === 'pointerdown' && options === true,
    );
    expect(captureKeydown).toHaveLength(1);
    expect(capturePointerdown).toHaveLength(1);
  });

  it('removes the document listeners when the injector is destroyed', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    TestBed.inject(InputModality);

    TestBed.resetTestingModule();

    const removedKeydown = removeSpy.mock.calls.filter(
      ([type, , options]) => type === 'keydown' && options === true,
    );
    const removedPointerdown = removeSpy.mock.calls.filter(
      ([type, , options]) => type === 'pointerdown' && options === true,
    );
    expect(removedKeydown).toHaveLength(1);
    expect(removedPointerdown).toHaveLength(1);
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
