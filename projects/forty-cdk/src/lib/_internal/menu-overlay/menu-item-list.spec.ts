import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createMenuItemList, type MenuItemHandle, type MenuItemList } from './menu-item-list';

interface TestItem extends MenuItemHandle {
  readonly id: string;
}

function makeItem(id: string, opts: { disabled?: boolean; text?: string } = {}): TestItem {
  const host = document.createElement('button');
  host.id = id;
  host.textContent = opts.text ?? id;
  document.body.appendChild(host);
  return {
    id,
    host,
    disabled: signal(opts.disabled ?? false),
  };
}

function build(loop: () => boolean = () => true): MenuItemList<TestItem> {
  let list!: MenuItemList<TestItem>;
  TestBed.runInInjectionContext(() => {
    list = createMenuItemList<TestItem>(loop);
  });
  return list;
}

describe('MenuItemList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    document.body.innerHTML = '';
  });

  describe('registration', () => {
    it('accumulates items in registration order and drops unregistered ones', () => {
      const list = build();
      const a = makeItem('a');
      const b = makeItem('b');
      const c = makeItem('c');
      list.registerItem(a);
      list.registerItem(b);
      list.registerItem(c);
      expect(list.items().map((i) => i.id)).toEqual(['a', 'b', 'c']);

      list.unregisterItem(b);
      expect(list.items().map((i) => i.id)).toEqual(['a', 'c']);
    });
  });

  describe('navigate', () => {
    it('moves focus to the next enabled item, skipping disabled', () => {
      const list = build();
      const a = makeItem('a');
      const b = makeItem('b', { disabled: true });
      const c = makeItem('c');
      list.registerItem(a);
      list.registerItem(b);
      list.registerItem(c);

      list.navigate(a.host, 'next');
      expect(document.activeElement).toBe(c.host);
    });

    it('honours the loop accessor', () => {
      const loop = signal(false);
      const list = build(() => loop());
      const a = makeItem('a');
      const b = makeItem('b');
      list.registerItem(a);
      list.registerItem(b);

      b.host.focus();
      list.navigate(b.host, 'next');
      expect(document.activeElement).toBe(b.host);

      loop.set(true);
      list.navigate(b.host, 'next');
      expect(document.activeElement).toBe(a.host);
    });

    it('is a no-op with no items', () => {
      const list = build();
      const phantom = document.createElement('button');
      expect(() => list.navigate(phantom, 'next')).not.toThrow();
    });
  });

  describe('handleTypeahead', () => {
    it('focuses the first enabled item whose text starts with the buffer', () => {
      const list = build();
      const apple = makeItem('apple');
      const banana = makeItem('banana');
      list.registerItem(apple);
      list.registerItem(banana);

      list.handleTypeahead(new KeyboardEvent('keydown', { key: 'b' }));
      expect(document.activeElement).toBe(banana.host);
    });

    it('uses the textValue override when present', () => {
      const list = build();
      const a = makeItem('a', { text: '🍎 Apple' });
      const b = makeItem('b', { text: '🍌 Banana' });
      list.registerItem({ ...a, textValue: signal('Apple') });
      const bWithOverride: TestItem = { ...b, textValue: signal('Banana') };
      list.registerItem(bWithOverride);

      list.handleTypeahead(new KeyboardEvent('keydown', { key: 'b' }));
      expect(document.activeElement).toBe(bWithOverride.host);
    });

    it('does nothing for non-printable keys', () => {
      const list = build();
      const a = makeItem('a');
      list.registerItem(a);
      const before = document.activeElement;
      list.handleTypeahead(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(document.activeElement).toBe(before);
    });
  });

  describe('focusFirst/LastEnabledItem', () => {
    it('focuses the first enabled item', () => {
      const list = build();
      const a = makeItem('a', { disabled: true });
      const b = makeItem('b');
      list.registerItem(a);
      list.registerItem(b);
      expect(list.focusFirstEnabledItem()).toBe(true);
      expect(document.activeElement).toBe(b.host);
    });

    it('focuses the last enabled item', () => {
      const list = build();
      const a = makeItem('a');
      const b = makeItem('b');
      const c = makeItem('c', { disabled: true });
      list.registerItem(a);
      list.registerItem(b);
      list.registerItem(c);
      expect(list.focusLastEnabledItem()).toBe(true);
      expect(document.activeElement).toBe(b.host);
    });

    it('returns false when no enabled items exist', () => {
      const list = build();
      list.registerItem(makeItem('a', { disabled: true }));
      expect(list.focusFirstEnabledItem()).toBe(false);
      expect(list.focusLastEnabledItem()).toBe(false);
    });
  });
});
