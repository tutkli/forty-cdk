import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ElementRegistry } from './element-registry';

function createRegistry(): ElementRegistry {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ElementRegistry);
}

describe('ElementRegistry', () => {
  describe('identifiedSlot', () => {
    it('seeds a generated id off the configured prefix', () => {
      const registry = createRegistry();
      const slot = registry.identifiedSlot('for-overlay-test', 'trigger');
      expect(slot.id()).toContain('for-overlay-test-trigger');
    });

    it('registers and clears the element only for the same node', () => {
      const registry = createRegistry();
      const slot = registry.identifiedSlot('for-overlay-test', 'content');
      const el = document.createElement('div');
      slot.register(el);
      expect(slot.element()).toBe(el);

      slot.unregister(document.createElement('div'));
      expect(slot.element()).toBe(el);

      slot.unregister(el);
      expect(slot.element()).toBeNull();
    });

    it('adopts a consumer static id on register', () => {
      const registry = createRegistry();
      const slot = registry.identifiedSlot('for-overlay-test', 'trigger');
      const el = document.createElement('button');
      el.id = 'my-trigger';
      slot.register(el);
      expect(slot.id()).toBe('my-trigger');
    });

    it('keeps the generated id when the element carries none', () => {
      const registry = createRegistry();
      const slot = registry.identifiedSlot('for-overlay-test', 'trigger');
      const generated = slot.id();
      slot.register(document.createElement('button'));
      expect(slot.id()).toBe(generated);
    });
  });

  describe('elementSlot', () => {
    it('registers and clears without adopting an id', () => {
      const registry = createRegistry();
      const slot = registry.elementSlot();
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
      const registry = createRegistry();
      const slot = registry.anchorSlot('[forty-cdk/test] multiple anchors');
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
      const registry = createRegistry();
      const slot = registry.anchorSlot('[forty-cdk/test] multiple anchors');
      slot.register(document.createElement('div'));
      expect(() => slot.register(document.createElement('div'))).toThrowError(
        '[forty-cdk/test] multiple anchors',
      );
    });

    it('re-registering the same anchor is idempotent', () => {
      const registry = createRegistry();
      const slot = registry.anchorSlot('[forty-cdk/test] multiple anchors');
      const el = document.createElement('div');
      slot.register(el);
      expect(() => slot.register(el)).not.toThrow();
      expect(slot.element()).toBe(el);
    });
  });
});
