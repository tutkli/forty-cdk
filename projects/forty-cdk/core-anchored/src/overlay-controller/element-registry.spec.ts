import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IdGenerator } from 'forty-cdk/core';
import {
  anchorSlot,
  injectIdentifiedSlot,
  injectSlotId,
  RootedTriggerSlot,
} from './element-registry';

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

const ANCHOR_CONFIG = {
  primitive: 'combobox',
  owner: '[forCombobox]',
  claimant: '[forComboboxAnchor]',
};

function makeAnchorSlot() {
  return TestBed.runInInjectionContext(() => anchorSlot(ANCHOR_CONFIG));
}

describe('RootedTriggerSlot', () => {
  const handle = (host: HTMLElement, staticId: string | null = null) => ({
    host,
    staticId,
    root: signal<object | null>({}).asReadonly(),
  });

  it('resolves the newest handle, and the one before it once the newest leaves', () => {
    const first = handle(document.createElement('button'));
    const newest = handle(document.createElement('button'));
    const triggers = signal([first, newest]);
    const slot = new RootedTriggerSlot(triggers, () => 'generated');

    expect(slot.element()).toBe(newest.host);

    triggers.set([first]);

    expect(slot.element()).toBe(first.host);
  });

  it('resolves no element and the generated id while no handle is registered', () => {
    const slot = new RootedTriggerSlot(signal([]), () => 'generated');

    expect(slot.element()).toBeNull();
    expect(slot.id()).toBe('generated');
  });

  it("names the newest handle's static id, and the generated one when it carries none", () => {
    const triggers = signal([handle(document.createElement('button'), 'mine')]);
    const slot = new RootedTriggerSlot(triggers, () => 'generated');

    expect(slot.id()).toBe('mine');

    triggers.set([handle(document.createElement('button'))]);

    expect(slot.id()).toBe('generated');
  });
});

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
