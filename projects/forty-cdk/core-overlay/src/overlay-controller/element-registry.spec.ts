import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IdGenerator } from 'forty-cdk/core';
import { anchorSlot, elementSlot, injectIdentifiedSlot, injectSlotId } from './element-registry';

function configure(): void {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
}

describe('injectSlotId', () => {
  it('seeds a generated id off the configured prefix', () => {
    configure();
    const id = TestBed.runInInjectionContext(() => injectSlotId('for-overlay-test', 'trigger'));
    expect(id()).toContain('for-overlay-test-trigger');
  });

  it('draws from the shared root IdGenerator rather than a private counter', () => {
    configure();
    const seeded = TestBed.runInInjectionContext(() => injectSlotId('for-overlay-test', 'trigger'));
    const next = TestBed.inject(IdGenerator).next('for-overlay-test-trigger');
    const counterOf = (value: string): number => Number(value.slice(value.lastIndexOf('-') + 1));
    expect(counterOf(next)).toBe(counterOf(seeded()) + 1);
  });
});

describe('injectIdentifiedSlot', () => {
  it('seeds a generated id off the configured prefix', () => {
    configure();
    const slot = TestBed.runInInjectionContext(() =>
      injectIdentifiedSlot('for-overlay-test', 'trigger'),
    );
    expect(slot.id()).toContain('for-overlay-test-trigger');
  });

  it('registers and clears the element only for the same node', () => {
    configure();
    const slot = TestBed.runInInjectionContext(() =>
      injectIdentifiedSlot('for-overlay-test', 'content'),
    );
    const el = document.createElement('div');
    slot.register(el);
    expect(slot.element()).toBe(el);

    slot.unregister(document.createElement('div'));
    expect(slot.element()).toBe(el);

    slot.unregister(el);
    expect(slot.element()).toBeNull();
  });

  it('adopts a consumer static id on register', () => {
    configure();
    const slot = TestBed.runInInjectionContext(() =>
      injectIdentifiedSlot('for-overlay-test', 'trigger'),
    );
    const el = document.createElement('button');
    el.id = 'my-trigger';
    slot.register(el);
    expect(slot.id()).toBe('my-trigger');
  });

  it('keeps the generated id when the element carries none', () => {
    configure();
    const slot = TestBed.runInInjectionContext(() =>
      injectIdentifiedSlot('for-overlay-test', 'trigger'),
    );
    const generated = slot.id();
    slot.register(document.createElement('button'));
    expect(slot.id()).toBe(generated);
  });
});

describe('elementSlot', () => {
  it('registers and clears without adopting an id', () => {
    const slot = elementSlot();
    const el = document.createElement('button');
    el.id = 'untouched';
    slot.register(el);
    expect(slot.element()).toBe(el);
    expect(el.id).toBe('untouched');

    slot.unregister(el);
    expect(slot.element()).toBeNull();
  });
});

describe('anchorSlot', () => {
  it('resolves to the first non-null fallback until an explicit anchor registers', () => {
    const slot = anchorSlot('[forty-cdk/test] multiple anchors');
    const trigger = signal<HTMLElement | null>(null);
    const input = signal<HTMLElement | null>(null);
    const anchor = slot.resolve(trigger, input);

    expect(anchor()).toBeNull();

    const inputEl = document.createElement('input');
    input.set(inputEl);
    expect(anchor()).toBe(inputEl);

    const triggerEl = document.createElement('button');
    trigger.set(triggerEl);
    expect(anchor()).toBe(triggerEl);

    const anchorEl = document.createElement('div');
    slot.register(anchorEl);
    expect(anchor()).toBe(anchorEl);

    slot.unregister(anchorEl);
    expect(anchor()).toBe(triggerEl);
  });

  it('throws the configured error when a second, different anchor registers', () => {
    const slot = anchorSlot('[forty-cdk/test] multiple anchors');
    slot.register(document.createElement('div'));
    expect(() => slot.register(document.createElement('div'))).toThrowError(
      '[forty-cdk/test] multiple anchors',
    );
  });

  it('re-registering the same anchor is idempotent', () => {
    const slot = anchorSlot('[forty-cdk/test] multiple anchors');
    const el = document.createElement('div');
    slot.register(el);
    expect(() => slot.register(el)).not.toThrow();
    expect(slot.element()).toBe(el);
  });
});

describe('the dependency-free slot factories', () => {
  it('construct with no injection context available', () => {
    expect(() => elementSlot()).not.toThrow();
    expect(() => anchorSlot('[forty-cdk/test] multiple anchors')).not.toThrow();
  });
});
