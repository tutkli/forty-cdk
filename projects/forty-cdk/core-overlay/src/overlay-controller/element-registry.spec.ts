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
  it('registers and clears without writing an id onto the element', () => {
    const slot = elementSlot();
    const el = document.createElement('button');
    el.id = 'untouched';
    slot.register(el);
    expect(slot.element()).toBe(el);
    expect(el.id).toBe('untouched');

    slot.unregister(el);
    expect(slot.element()).toBeNull();
  });

  it('captures a consumer-set static id on register', () => {
    const slot = elementSlot();
    const el = document.createElement('button');
    el.id = 'my-trigger';
    slot.register(el);

    expect(slot.adoptedId()).toBe('my-trigger');
  });

  it('reports no adopted id for an element that carries none', () => {
    const slot = elementSlot();
    expect(slot.adoptedId()).toBeNull();

    slot.register(document.createElement('button'));
    expect(slot.adoptedId()).toBeNull();
  });

  it('keeps the adopted id after the element deregisters', () => {
    const slot = elementSlot();
    const el = document.createElement('button');
    el.id = 'my-trigger';
    slot.register(el);
    slot.unregister(el);

    expect(slot.element()).toBeNull();
    expect(slot.adoptedId()).toBe('my-trigger');
  });
});

const ANCHOR_CONFIG = {
  primitive: 'combobox',
  owner: '[forCombobox]',
  claimant: '[forComboboxAnchor]',
};

function makeAnchorSlot() {
  return TestBed.runInInjectionContext(() => anchorSlot(ANCHOR_CONFIG));
}

describe('anchorSlot', () => {
  beforeEach(configure);

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('resolves to the first non-null fallback until an explicit anchor registers', () => {
    const slot = makeAnchorSlot();
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

  it('uses the newest anchor and warns once when a second one stays registered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeAnchorSlot();
    const first = document.createElement('div');
    const second = document.createElement('div');
    slot.register(first);
    slot.register(second);
    TestBed.tick();

    expect(slot.element()).toBe(second);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(
      /\[forty-cdk\/combobox\] FORCDK-CORE-005: A \[forCombobox\] coordinates a single \[forComboboxAnchor\], but 2 are registered/,
    );

    slot.unregister(second);
    expect(slot.element()).toBe(first);
  });

  it('does not warn when the second anchor leaves within the same pass', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeAnchorSlot();
    const outgoing = document.createElement('div');
    const incoming = document.createElement('div');
    slot.register(outgoing);
    TestBed.tick();
    slot.register(incoming);
    slot.unregister(outgoing);
    TestBed.tick();

    expect(slot.element()).toBe(incoming);
    expect(warn).not.toHaveBeenCalled();
  });

  it('re-registering the same anchor is idempotent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = makeAnchorSlot();
    const el = document.createElement('div');
    slot.register(el);
    slot.register(el);
    TestBed.tick();

    expect(slot.element()).toBe(el);
    expect(warn).not.toHaveBeenCalled();
    slot.unregister(el);
    expect(slot.element()).toBeNull();
  });
});

describe('the dependency-free slot factories', () => {
  it('construct with no injection context available', () => {
    expect(() => elementSlot()).not.toThrow();
  });
});
