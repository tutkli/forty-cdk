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

    it('cycles among same-initial items on repeated presses, resuming from focus', () => {
      const list = build();
      const cut = makeItem('cut', { text: 'Cut' });
      const copy = makeItem('copy', { text: 'Copy' });
      const clear = makeItem('clear', { text: 'Clear' });
      const paste = makeItem('paste', { text: 'Paste' });
      list.registerItem(cut);
      list.registerItem(copy);
      list.registerItem(clear);
      list.registerItem(paste);

      const pressC = () => {
        const event = new KeyboardEvent('keydown', { key: 'c' });
        (document.activeElement ?? document.body).dispatchEvent(event);
        list.handleTypeahead(event);
      };

      cut.host.focus();
      pressC();
      expect(document.activeElement).toBe(copy.host);
      pressC();
      expect(document.activeElement).toBe(clear.host);
      pressC();
      expect(document.activeElement).toBe(cut.host);
    });

    it('skips disabled items while cycling', () => {
      const list = build();
      const cut = makeItem('cut', { text: 'Cut' });
      const copy = makeItem('copy', { text: 'Copy', disabled: true });
      const clear = makeItem('clear', { text: 'Clear' });
      list.registerItem(cut);
      list.registerItem(copy);
      list.registerItem(clear);

      const pressC = () => {
        const event = new KeyboardEvent('keydown', { key: 'c' });
        (document.activeElement ?? document.body).dispatchEvent(event);
        list.handleTypeahead(event);
      };

      cut.host.focus();
      pressC();
      expect(document.activeElement).toBe(clear.host);
      pressC();
      expect(document.activeElement).toBe(cut.host);
    });

    it('prefix-matches the full buffer for distinct characters', () => {
      const list = build();
      const cut = makeItem('cut', { text: 'Cut' });
      const copy = makeItem('copy', { text: 'Copy' });
      list.registerItem(cut);
      list.registerItem(copy);

      cut.host.focus();
      const c = new KeyboardEvent('keydown', { key: 'c' });
      cut.host.dispatchEvent(c);
      list.handleTypeahead(c);
      const o = new KeyboardEvent('keydown', { key: 'o' });
      (document.activeElement ?? document.body).dispatchEvent(o);
      list.handleTypeahead(o);
      expect(document.activeElement).toBe(copy.host);
    });

    it('returns true for a consumed key and false for a non-printable one', () => {
      const list = build();
      list.registerItem(makeItem('apple'));

      expect(list.handleTypeahead(new KeyboardEvent('keydown', { key: 'a' }))).toBe(true);
      expect(list.handleTypeahead(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
    });

    it('rejects a Space with an empty buffer but consumes it mid-buffer', () => {
      const list = build();
      list.registerItem(makeItem('new-york', { text: 'New York' }));

      expect(list.handleTypeahead(new KeyboardEvent('keydown', { key: ' ' }))).toBe(false);
      expect(list.handleTypeahead(new KeyboardEvent('keydown', { key: 'n' }))).toBe(true);
      expect(list.handleTypeahead(new KeyboardEvent('keydown', { key: ' ' }))).toBe(true);
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

    it('asks the target to suppress its next focus highlight when highlight is false', () => {
      const list = build();
      const suppressA = vi.fn();
      const suppressB = vi.fn();
      list.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppressA });
      list.registerItem({ ...makeItem('b'), suppressHighlightOnNextFocus: suppressB });

      expect(list.focusFirstEnabledItem(false)).toBe(true);
      expect(suppressA).toHaveBeenCalledTimes(1);
      expect(suppressB).not.toHaveBeenCalled();
      expect(document.activeElement?.id).toBe('a');

      expect(list.focusLastEnabledItem(false)).toBe(true);
      expect(suppressB).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.id).toBe('b');
    });

    it('does not suppress when highlight is omitted or true', () => {
      const list = build();
      const suppress = vi.fn();
      list.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      expect(list.focusFirstEnabledItem()).toBe(true);
      expect(list.focusLastEnabledItem(true)).toBe(true);
      expect(suppress).not.toHaveBeenCalled();
    });

    it('tolerates handles without the optional suppression hook', () => {
      const list = build();
      list.registerItem(makeItem('a'));
      expect(list.focusFirstEnabledItem(false)).toBe(true);
      expect(document.activeElement?.id).toBe('a');
    });
  });

  describe('focusInitialEnabledItem', () => {
    it("routes 'first' to the first enabled item and 'last' to the last enabled one", () => {
      const list = build();
      const a = makeItem('a', { disabled: true });
      const b = makeItem('b');
      const c = makeItem('c');
      const d = makeItem('d', { disabled: true });
      list.registerItem(a);
      list.registerItem(b);
      list.registerItem(c);
      list.registerItem(d);

      expect(list.focusInitialEnabledItem('first')).toBe(true);
      expect(document.activeElement).toBe(b.host);

      expect(list.focusInitialEnabledItem('last')).toBe(true);
      expect(document.activeElement).toBe(c.host);
    });

    it('returns false when no enabled items exist, for either target', () => {
      const list = build();
      list.registerItem(makeItem('a', { disabled: true }));
      expect(list.focusInitialEnabledItem('first')).toBe(false);
      expect(list.focusInitialEnabledItem('last')).toBe(false);
    });

    it('forwards the highlight suppression to the resolved target', () => {
      const list = build();
      const suppressA = vi.fn();
      const suppressB = vi.fn();
      list.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppressA });
      list.registerItem({ ...makeItem('b'), suppressHighlightOnNextFocus: suppressB });

      expect(list.focusInitialEnabledItem('last', false)).toBe(true);
      expect(suppressB).toHaveBeenCalledTimes(1);
      expect(suppressA).not.toHaveBeenCalled();

      expect(list.focusInitialEnabledItem('first', false)).toBe(true);
      expect(suppressA).toHaveBeenCalledTimes(1);
    });

    it('highlights when the flag is omitted', () => {
      const list = build();
      const suppress = vi.fn();
      list.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      expect(list.focusInitialEnabledItem('first')).toBe(true);
      expect(list.focusInitialEnabledItem('last')).toBe(true);
      expect(suppress).not.toHaveBeenCalled();
    });
  });

  describe('clearHighlights', () => {
    it('invokes clearHighlight on every registered item without moving focus', () => {
      const list = build();
      const clearA = vi.fn();
      const clearB = vi.fn();
      const a = makeItem('a');
      const b = makeItem('b');
      list.registerItem({ ...a, clearHighlight: clearA });
      list.registerItem({ ...b, clearHighlight: clearB });

      a.host.focus();
      list.clearHighlights();

      expect(clearA).toHaveBeenCalledTimes(1);
      expect(clearB).toHaveBeenCalledTimes(1);
      // Clearing the highlight must not move DOM focus.
      expect(document.activeElement?.id).toBe('a');
    });

    it('tolerates handles without the optional clearHighlight hook', () => {
      const list = build();
      list.registerItem(makeItem('a'));
      expect(() => list.clearHighlights()).not.toThrow();
    });
  });

  describe('focus scroll policy', () => {
    it('moves arrow navigation focus with preventScroll and a nearest scroll', () => {
      const list = build();
      const a = makeItem('a');
      const b = makeItem('b');
      list.registerItem(a);
      list.registerItem(b);
      const focusSpy = vi.spyOn(b.host, 'focus');
      const scrollSpy = vi.fn();
      b.host.scrollIntoView = scrollSpy;

      list.navigate(a.host, 'next');

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
      expect(document.activeElement).toBe(b.host);
    });

    it('moves typeahead focus with preventScroll and a nearest scroll', () => {
      const list = build();
      const apple = makeItem('apple');
      const banana = makeItem('banana');
      list.registerItem(apple);
      list.registerItem(banana);
      const focusSpy = vi.spyOn(banana.host, 'focus');
      const scrollSpy = vi.fn();
      banana.host.scrollIntoView = scrollSpy;

      list.handleTypeahead(new KeyboardEvent('keydown', { key: 'b' }));

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
      expect(document.activeElement).toBe(banana.host);
    });

    it('moves the initial first-item focus with preventScroll', () => {
      const list = build();
      const a = makeItem('a', { disabled: true });
      const b = makeItem('b');
      list.registerItem(a);
      list.registerItem(b);
      const focusSpy = vi.spyOn(b.host, 'focus');
      const scrollSpy = vi.fn();
      b.host.scrollIntoView = scrollSpy;

      expect(list.focusFirstEnabledItem()).toBe(true);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('moves the initial last-item focus with preventScroll', () => {
      const list = build();
      const a = makeItem('a');
      const b = makeItem('b');
      const c = makeItem('c', { disabled: true });
      list.registerItem(a);
      list.registerItem(b);
      list.registerItem(c);
      const focusSpy = vi.spyOn(b.host, 'focus');
      const scrollSpy = vi.fn();
      b.host.scrollIntoView = scrollSpy;

      expect(list.focusLastEnabledItem()).toBe(true);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('still suppresses the highlight while passing preventScroll', () => {
      const list = build();
      const suppress = vi.fn();
      const a = makeItem('a');
      list.registerItem({ ...a, suppressHighlightOnNextFocus: suppress });
      const focusSpy = vi.spyOn(a.host, 'focus');

      expect(list.focusFirstEnabledItem(false)).toBe(true);

      expect(suppress).toHaveBeenCalledTimes(1);
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
  });
});
