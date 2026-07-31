import { Directive, output, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  createVetoableEvent,
  createVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';
import type { ForMenuCloseReason } from './menu-context';
import type { MenuItemHandle } from './menu-item-list';
import {
  createMenuOverlay,
  type MenuOverlay,
  type MenuOverlayHooks,
  type MenuOverlayTransitionOptions,
} from './menu-overlay';

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

/**
 * Tiny directive that owns the outputs the helper reads. Outputs must be
 * declared as class-field initializers per the Angular compiler — building
 * them inline inside a test fixture closure is rejected (NG8110).
 */
@Directive({ standalone: true })
class HooksHost {
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();
  readonly autoFocusOnOpen = output<VetoableEvent>();
  readonly autoFocusOnClose = output<VetoableEvent>();
}

interface BuiltOverlay {
  overlay: MenuOverlay<TestItem>;
  hooks: MenuOverlayHooks & {
    open: ReturnType<typeof signal<boolean>>;
    disabled: ReturnType<typeof signal<boolean>>;
    dismissible: ReturnType<typeof signal<boolean>>;
    loop: ReturnType<typeof signal<boolean>>;
  };
  emitted: {
    escapeKeyDown: VetoableNativeEvent<KeyboardEvent>[];
    pointerDownOutside: VetoableNativeEvent<PointerEvent>[];
    focusOutside: VetoableNativeEvent<FocusEvent>[];
    interactOutside: VetoableNativeEvent<PointerEvent | FocusEvent>[];
    autoFocusOnOpen: VetoableEvent[];
    autoFocusOnClose: VetoableEvent[];
  };
  lifecycle: {
    opens: { initialFocus: 'first' | 'last'; options: MenuOverlayTransitionOptions }[];
    closes: { reason: ForMenuCloseReason; options: MenuOverlayTransitionOptions }[];
  };
}

/**
 * Builds the helper inside `TestBed.runInInjectionContext` so the
 * `HooksHost` directive's `output()` and the helper's `inject()` calls
 * resolve. The Angular compiler's NG8110 check passes because `output()`
 * is a class-field initializer on `HooksHost` (not an inline call inside
 * a fixture function).
 */
function build(idPrefix = 'test'): BuiltOverlay {
  let result!: BuiltOverlay;
  TestBed.runInInjectionContext(() => {
    const host = new HooksHost();
    const open = signal(false);
    const disabled = signal(false);
    const dismissible = signal(true);
    const loop = signal(true);

    const emitted: BuiltOverlay['emitted'] = {
      escapeKeyDown: [],
      pointerDownOutside: [],
      focusOutside: [],
      interactOutside: [],
      autoFocusOnOpen: [],
      autoFocusOnClose: [],
    };
    host.escapeKeyDown.subscribe((e) => emitted.escapeKeyDown.push(e));
    host.pointerDownOutside.subscribe((e) => emitted.pointerDownOutside.push(e));
    host.focusOutside.subscribe((e) => emitted.focusOutside.push(e));
    host.interactOutside.subscribe((e) => emitted.interactOutside.push(e));
    host.autoFocusOnOpen.subscribe((e) => emitted.autoFocusOnOpen.push(e));
    host.autoFocusOnClose.subscribe((e) => emitted.autoFocusOnClose.push(e));

    const lifecycle: BuiltOverlay['lifecycle'] = { opens: [], closes: [] };

    const hooks = {
      open: open as MenuOverlayHooks['open'] & ReturnType<typeof signal<boolean>>,
      disabled,
      dismissible,
      loop,
      escapeKeyDown: host.escapeKeyDown,
      pointerDownOutside: host.pointerDownOutside,
      focusOutside: host.focusOutside,
      interactOutside: host.interactOutside,
      autoFocusOnOpen: host.autoFocusOnOpen,
      autoFocusOnClose: host.autoFocusOnClose,
      onOpen: (initialFocus: 'first' | 'last', options: MenuOverlayTransitionOptions) => {
        lifecycle.opens.push({ initialFocus, options });
      },
      onClose: (reason: ForMenuCloseReason, options: MenuOverlayTransitionOptions) => {
        lifecycle.closes.push({ reason, options });
      },
    };
    const overlay = createMenuOverlay<TestItem>(idPrefix, hooks);
    result = { overlay, hooks, emitted, lifecycle };
  });
  return result;
}

describe('MenuOverlay', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    document.body.innerHTML = '';
  });

  describe('id generation', () => {
    it('produces distinct ids for trigger and content prefixed by idPrefix', () => {
      const { overlay } = build('for-test-menu');
      expect(overlay.triggerId()).toMatch(/^for-test-menu-trigger-/);
      expect(overlay.contentId()).toMatch(/^for-test-menu-content-/);
      expect(overlay.triggerId()).not.toEqual(overlay.contentId());
    });
  });

  describe('trigger / content / item registration', () => {
    it('exposes the registered trigger element until unregistered', () => {
      const { overlay } = build();
      const el = document.createElement('button');
      overlay.registerTrigger(el);
      expect(overlay.trigger()).toBe(el);
      overlay.unregisterTrigger(el);
      expect(overlay.trigger()).toBeNull();
    });

    it('does not clear trigger when a stale element unregisters', () => {
      const { overlay } = build();
      const a = document.createElement('button');
      const b = document.createElement('button');
      overlay.registerTrigger(a);
      overlay.registerTrigger(b);
      overlay.unregisterTrigger(a);
      expect(overlay.trigger()).toBe(b);
    });

    it('leaves trigger unresolved while two openers compete and none is active', () => {
      const { overlay } = build();
      const a = document.createElement('button');
      const b = document.createElement('button');
      overlay.registerOpener(a);
      overlay.registerOpener(b);
      expect(overlay.trigger()).toBeNull();

      overlay.activateOpener(b);
      expect(overlay.trigger()).toBe(b);
    });

    it('registers content the same way', () => {
      const { overlay } = build();
      const el = document.createElement('div');
      overlay.registerContent(el);
      expect(overlay.content()).toBe(el);
      overlay.unregisterContent(el);
      expect(overlay.content()).toBeNull();
    });

    it('accumulates items in registration order', () => {
      const { overlay } = build();
      const a = makeItem('a');
      const b = makeItem('b');
      const c = makeItem('c');
      overlay.registerItem(a);
      overlay.registerItem(b);
      overlay.registerItem(c);
      expect(overlay.items().map((i) => i.id)).toEqual(['a', 'b', 'c']);
      overlay.unregisterItem(b);
      expect(overlay.items().map((i) => i.id)).toEqual(['a', 'c']);
    });
  });

  describe('opener registry', () => {
    it('reports each opener own id, falling back to the seed with none resolvable', () => {
      const { overlay } = build('for-test-menu');
      const seed = overlay.triggerId();
      const a = document.createElement('button');
      const b = document.createElement('div');

      overlay.registerOpener(a, { id: signal('opener-a') });
      expect(overlay.triggerId()).toBe('opener-a');

      overlay.registerOpener(b, { id: signal('opener-b') });
      expect(overlay.triggerId()).toBe(seed);

      overlay.activateOpener(b);
      expect(overlay.triggerId()).toBe('opener-b');
    });

    it('anchors per opener, so switching back restores the element anchor with no clearing step', () => {
      const { overlay } = build();
      const button = document.createElement('button');
      const region = document.createElement('div');
      overlay.registerOpener(button);
      overlay.registerOpener(region);

      overlay.activateOpener(button);
      expect(overlay.openerAnchor()).toBe(button);
      expect(overlay.openerVirtualAnchor()).toBeNull();

      overlay.activateOpener(region);
      overlay.setVirtualAnchor(12, 34);
      const virtual = overlay.openerVirtualAnchor();
      expect(virtual).not.toBe(region);
      expect(virtual?.getBoundingClientRect().left).toBe(12);
      expect(virtual?.getBoundingClientRect().top).toBe(34);
      expect(overlay.openerAnchor()).toBe(virtual);

      overlay.activateOpener(button);
      expect(overlay.openerAnchor()).toBe(button);
      expect(overlay.openerVirtualAnchor()).toBeNull();
    });

    it('snapshots a rect anchor by value', () => {
      const { overlay } = build();
      const region = document.createElement('div');
      overlay.registerOpener(region);
      overlay.setVirtualAnchorFromRect({
        x: 5,
        y: 6,
        width: 20,
        height: 10,
      } as DOMRect);

      const rect = overlay.openerVirtualAnchor()?.getBoundingClientRect();
      expect(rect?.right).toBe(25);
      expect(rect?.bottom).toBe(16);
    });

    it('exempts only the openers that asked for it', () => {
      const { overlay } = build();
      const button = document.createElement('button');
      const region = document.createElement('div');
      overlay.registerOpener(button, { dismissibleExempt: true });
      overlay.registerOpener(region);

      expect(overlay.openerExemptions()).toEqual([button]);

      overlay.unregisterOpener(button);
      expect(overlay.openerExemptions()).toEqual([]);
    });

    it('clears the active opener when it unregisters', () => {
      const { overlay } = build();
      const button = document.createElement('button');
      const region = document.createElement('div');
      overlay.registerOpener(button);
      overlay.registerOpener(region);
      overlay.activateOpener(button);
      expect(overlay.trigger()).toBe(button);

      overlay.unregisterOpener(button);
      expect(overlay.trigger()).toBe(region);
    });
  });

  describe('navigate', () => {
    it('moves focus to the next enabled item, skipping disabled', () => {
      const { overlay } = build();
      const a = makeItem('a');
      const b = makeItem('b', { disabled: true });
      const c = makeItem('c');
      overlay.registerItem(a);
      overlay.registerItem(b);
      overlay.registerItem(c);

      overlay.navigate(a.host, 'next');
      expect(document.activeElement).toBe(c.host);
    });

    it('honours `loop` from the hooks', () => {
      const { overlay, hooks } = build();
      const a = makeItem('a');
      const b = makeItem('b');
      overlay.registerItem(a);
      overlay.registerItem(b);

      hooks.loop.set(false);
      b.host.focus();
      overlay.navigate(b.host, 'next');
      expect(document.activeElement).toBe(b.host); // no wrap

      hooks.loop.set(true);
      overlay.navigate(b.host, 'next');
      expect(document.activeElement).toBe(a.host); // wrap to first
    });

    it('is a no-op with no items', () => {
      const { overlay } = build();
      const phantom = document.createElement('button');
      expect(() => overlay.navigate(phantom, 'next')).not.toThrow();
    });
  });

  describe('handleTypeahead', () => {
    it('focuses the first enabled item whose text starts with the buffer', () => {
      const { overlay } = build();
      const apple = makeItem('apple');
      const banana = makeItem('banana');
      const cherry = makeItem('cherry');
      overlay.registerItem(apple);
      overlay.registerItem(banana);
      overlay.registerItem(cherry);

      overlay.handleTypeahead(new KeyboardEvent('keydown', { key: 'b' }));
      expect(document.activeElement).toBe(banana.host);
    });

    it('uses textValue override when present', () => {
      const { overlay } = build();
      const a = makeItem('a', { text: '🍎 Apple' });
      const b = makeItem('b', { text: '🍌 Banana' });
      const aWithOverride: TestItem = { ...a, textValue: signal('Apple') };
      const bWithOverride: TestItem = { ...b, textValue: signal('Banana') };
      overlay.registerItem(aWithOverride);
      overlay.registerItem(bWithOverride);

      overlay.handleTypeahead(new KeyboardEvent('keydown', { key: 'b' }));
      expect(document.activeElement).toBe(bWithOverride.host);
    });

    it('does nothing for non-printable keys', () => {
      const { overlay } = build();
      const a = makeItem('a');
      overlay.registerItem(a);
      const before = document.activeElement;
      overlay.handleTypeahead(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(document.activeElement).toBe(before);
    });
  });

  describe('clearItemHighlights', () => {
    it('delegates clearHighlight to every registered item without moving focus', () => {
      const { overlay } = build();
      const clearA = vi.fn();
      const clearB = vi.fn();
      const a = makeItem('a');
      const b = makeItem('b');
      overlay.registerItem({ ...a, clearHighlight: clearA });
      overlay.registerItem({ ...b, clearHighlight: clearB });

      a.host.focus();
      overlay.clearItemHighlights();

      expect(clearA).toHaveBeenCalledTimes(1);
      expect(clearB).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.id).toBe('a');
    });
  });

  describe('focusFirst/LastEnabledItem', () => {
    it('focuses first enabled item', () => {
      const { overlay } = build();
      const a = makeItem('a', { disabled: true });
      const b = makeItem('b');
      const c = makeItem('c');
      overlay.registerItem(a);
      overlay.registerItem(b);
      overlay.registerItem(c);
      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(document.activeElement).toBe(b.host);
    });

    it('focuses last enabled item', () => {
      const { overlay } = build();
      const a = makeItem('a');
      const b = makeItem('b');
      const c = makeItem('c', { disabled: true });
      overlay.registerItem(a);
      overlay.registerItem(b);
      overlay.registerItem(c);
      expect(overlay.focusLastEnabledItem()).toBe(true);
      expect(document.activeElement).toBe(b.host);
    });

    it('returns false when no enabled items exist', () => {
      const { overlay } = build();
      const a = makeItem('a', { disabled: true });
      overlay.registerItem(a);
      expect(overlay.focusFirstEnabledItem()).toBe(false);
      expect(overlay.focusLastEnabledItem()).toBe(false);
    });
  });

  describe('focusInitialEnabledItem', () => {
    it('resolves the target to the matching enabled item', () => {
      const { overlay } = build();
      const a = makeItem('a', { disabled: true });
      const b = makeItem('b');
      const c = makeItem('c');
      overlay.registerItem(a);
      overlay.registerItem(b);
      overlay.registerItem(c);

      expect(overlay.focusInitialEnabledItem('first')).toBe(true);
      expect(document.activeElement).toBe(b.host);

      expect(overlay.focusInitialEnabledItem('last')).toBe(true);
      expect(document.activeElement).toBe(c.host);
    });

    it('consumes the one-shot pointer-open highlight suppression', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      overlay.openMenu('first', 'pointer');
      expect(overlay.focusInitialEnabledItem('first')).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);

      expect(overlay.focusInitialEnabledItem('first')).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);
    });

    it('returns false when no enabled items exist', () => {
      const { overlay } = build();
      overlay.registerItem(makeItem('a', { disabled: true }));
      expect(overlay.focusInitialEnabledItem('first')).toBe(false);
      expect(overlay.focusInitialEnabledItem('last')).toBe(false);
    });
  });

  describe('activation modality', () => {
    it('suppresses the initial-focus highlight exactly once after a pointer open', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      overlay.openMenu('first', 'pointer');
      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);

      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);
    });

    it('suppresses the last-item focus highlight after a pointer open with initialFocus last', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem(makeItem('a'));
      overlay.registerItem({ ...makeItem('b'), suppressHighlightOnNextFocus: suppress });

      overlay.openMenu('last', 'pointer');
      expect(overlay.focusLastEnabledItem()).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);
    });

    it('keyboard (default) opens never suppress the highlight', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      overlay.openMenu('first');
      expect(overlay.focusFirstEnabledItem()).toBe(true);

      overlay.closeMenu('programmatic');
      overlay.openMenu('first', 'keyboard');
      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(suppress).not.toHaveBeenCalled();
    });

    it('a keyboard open resets a prior unconsumed pointer suppression', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      overlay.openMenu('first', 'pointer');
      overlay.closeMenu('programmatic');
      overlay.openMenu('first', 'keyboard');
      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(suppress).not.toHaveBeenCalled();
    });

    it('toggle forwards the modality on its open branch', () => {
      const { overlay } = build();
      const suppress = vi.fn();
      overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });

      overlay.toggle('first', 'pointer');
      expect(overlay.focusFirstEnabledItem()).toBe(true);
      expect(suppress).toHaveBeenCalledTimes(1);
    });
  });

  describe('open / close / toggle', () => {
    it('open / close write through the open hook', () => {
      const { overlay, hooks } = build();
      overlay.openMenu('first');
      expect(hooks.open()).toBe(true);
      expect(overlay.initialFocus()).toBe('first');

      overlay.closeMenu('programmatic');
      expect(hooks.open()).toBe(false);
    });

    it('toggle flips open and tracks initialFocus', () => {
      const { overlay, hooks } = build();
      overlay.toggle('last');
      expect(hooks.open()).toBe(true);
      expect(overlay.initialFocus()).toBe('last');

      overlay.toggle();
      expect(hooks.open()).toBe(false);
    });

    it('honours disabled — toggle and openMenu become no-ops', () => {
      const { overlay, hooks } = build();
      hooks.disabled.set(true);
      overlay.toggle();
      expect(hooks.open()).toBe(false);
      overlay.openMenu();
      expect(hooks.open()).toBe(false);
    });
  });

  describe('openMenu over an already-open menu', () => {
    function openWithItems(
      items: readonly { id: string; disabled?: boolean }[],
    ): BuiltOverlay & { outside: HTMLElement } {
      const built = build();
      for (const spec of items) {
        built.overlay.registerItem(makeItem(spec.id, { disabled: spec.disabled }));
      }
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      built.overlay.openMenu('first');
      outside.focus();
      return { ...built, outside };
    }

    it('moves focus to the first enabled item instead of doing nothing', () => {
      const { overlay, hooks } = openWithItems([{ id: 'a', disabled: true }, { id: 'b' }]);

      overlay.openMenu('first');

      expect(hooks.open()).toBe(true);
      expect(document.activeElement?.id).toBe('b');
    });

    it('moves focus to the last enabled item for an ArrowUp-style re-open', () => {
      const { overlay, hooks } = openWithItems([
        { id: 'a' },
        { id: 'b' },
        { id: 'c', disabled: true },
      ]);

      overlay.openMenu('last');

      expect(hooks.open()).toBe(true);
      expect(overlay.initialFocus()).toBe('last');
      expect(document.activeElement?.id).toBe('b');
    });

    it('still runs the onOpen hook so in-flight hover scheduling is cancelled', () => {
      const { overlay, lifecycle } = openWithItems([{ id: 'a' }]);

      overlay.openMenu('last');

      expect(lifecycle.opens).toEqual([
        { initialFocus: 'first', options: {} },
        { initialFocus: 'last', options: {} },
      ]);
    });

    it('leaves focus alone for a suppressFocusMoves transition (hover-open)', () => {
      const { overlay, hooks, outside } = openWithItems([{ id: 'a' }]);

      overlay.openMenu('first', 'pointer', { suppressFocusMoves: true });

      expect(hooks.open()).toBe(true);
      expect(document.activeElement).toBe(outside);
    });

    it('suppresses the highlight on a pointer re-open and keeps it on a keyboard one', () => {
      const built = build();
      const suppress = vi.fn();
      built.overlay.registerItem({ ...makeItem('a'), suppressHighlightOnNextFocus: suppress });
      built.overlay.openMenu('first');

      built.overlay.openMenu('first', 'pointer');
      expect(suppress).toHaveBeenCalledTimes(1);
      expect(document.activeElement?.id).toBe('a');

      built.overlay.openMenu('first', 'keyboard');
      expect(suppress).toHaveBeenCalledTimes(1);
    });

    it('moves nothing when the open menu has no enabled item', () => {
      const { overlay, hooks, outside } = openWithItems([
        { id: 'a', disabled: true },
        { id: 'b', disabled: true },
      ]);

      expect(() => overlay.openMenu('first')).not.toThrow();

      expect(hooks.open()).toBe(true);
      expect(document.activeElement).toBe(outside);
    });

    it('never closes the menu, whichever open key drove it', () => {
      const { overlay, hooks, lifecycle } = openWithItems([{ id: 'a' }]);

      overlay.openMenu('first');
      overlay.openMenu('last');

      expect(hooks.open()).toBe(true);
      expect(lifecycle.closes).toHaveLength(0);
    });
  });

  describe('lastCloseReason', () => {
    it('is null initially', () => {
      const { overlay } = build();
      expect(overlay.lastCloseReason()).toBeNull();
    });

    it('records the reason passed to closeMenu', () => {
      const { overlay } = build();
      overlay.closeMenu('tab');
      expect(overlay.lastCloseReason()).toBe('tab');

      overlay.closeMenu('select');
      expect(overlay.lastCloseReason()).toBe('select');
    });

    it('resets to null on openMenu', () => {
      const { overlay } = build();
      overlay.closeMenu('tab');
      expect(overlay.lastCloseReason()).toBe('tab');

      overlay.openMenu('first');
      expect(overlay.lastCloseReason()).toBeNull();
    });

    it('records the implicit reason from a toggle-close', () => {
      const { overlay } = build();
      overlay.openMenu('first');
      expect(overlay.lastCloseReason()).toBeNull();

      overlay.toggle();
      expect(overlay.lastCloseReason()).toBe('programmatic');
    });

    it('records `escape` when an undismissed escape closes the menu', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      overlay.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      expect(overlay.lastCloseReason()).toBe('escape');
    });

    it('records the hover reason from a pointer-driven close', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      overlay.closeMenu('hover');
      expect(overlay.lastCloseReason()).toBe('hover');
      expect(hooks.open()).toBe(false);
    });

    it('resets to null on a pointer-driven open (transition options do not skip the reset)', () => {
      const { overlay, hooks } = build();
      overlay.closeMenu('hover', { suppressFocusMoves: true });
      expect(overlay.lastCloseReason()).toBe('hover');

      overlay.openMenu('first', 'pointer', { suppressFocusMoves: true });
      expect(overlay.lastCloseReason()).toBeNull();
      expect(hooks.open()).toBe(true);
    });
  });

  describe('transition options', () => {
    it('forwards the open options verbatim to the onOpen hook', () => {
      const { overlay, lifecycle } = build();
      overlay.openMenu('last', 'pointer', { suppressFocusMoves: true });
      expect(lifecycle.opens).toEqual([
        { initialFocus: 'last', options: { suppressFocusMoves: true } },
      ]);
    });

    it('defaults the open options to an empty object', () => {
      const { overlay, lifecycle } = build();
      overlay.openMenu('first');
      expect(lifecycle.opens[0]!.options.suppressFocusMoves).toBeUndefined();
    });

    it('forwards the close options verbatim to the onClose hook', () => {
      const { overlay, lifecycle } = build();
      overlay.closeMenu('hover', { suppressFocusMoves: true });
      expect(lifecycle.closes).toEqual([
        { reason: 'hover', options: { suppressFocusMoves: true } },
      ]);
    });

    it('defaults the close options to an empty object for the existing close paths', () => {
      const { overlay, lifecycle } = build();
      overlay.closeMenu('select');
      expect(lifecycle.closes[0]!.options.suppressFocusMoves).toBeUndefined();

      overlay.openMenu();
      overlay.toggle();
      expect(lifecycle.closes[1]!.reason).toBe('programmatic');
      expect(lifecycle.closes[1]!.options.suppressFocusMoves).toBeUndefined();
    });

    it('arms the initial-focus target on a pointer-driven open', () => {
      const { overlay } = build();
      overlay.openMenu('last', 'pointer', { suppressFocusMoves: true });
      expect(overlay.initialFocus()).toBe('last');
    });

    it('still honours disabled — a pointer-driven open is a no-op', () => {
      const { overlay, hooks, lifecycle } = build();
      hooks.disabled.set(true);
      overlay.openMenu('first', 'pointer', { suppressFocusMoves: true });
      expect(hooks.open()).toBe(false);
      expect(lifecycle.opens).toHaveLength(0);
    });
  });

  describe('escape veto', () => {
    it('closes when no consumer vetoes and dismissible is true', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      overlay.emitEscapeKeyDown(event);
      expect(hooks.open()).toBe(false);
    });

    it('does not close when consumer calls preventDefault on the veto', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      hooks.escapeKeyDown.subscribe((e) => e.preventDefault());
      overlay.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(hooks.open()).toBe(true);
    });

    it('does not close when dismissible is false', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      hooks.dismissible.set(false);
      overlay.emitEscapeKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(hooks.open()).toBe(true);
    });
  });

  // The shared `#pendingOutsideVeto` reuse between the specific outside
  // channels and the composite `interactOutside` now lives in
  // `injectOverlayShell` (see overlay-shell.spec). The helper only forwards
  // the shell-built veto to the matching output and owns the close decision.
  describe('outside dismiss', () => {
    it('forwards the veto verbatim to the matching output', () => {
      const { overlay, hooks, emitted } = build();
      hooks.open.set(true);
      const pointerVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(
        new PointerEvent('pointerdown'),
      );
      overlay.emitPointerDownOutside(pointerVeto as VetoableNativeEvent<PointerEvent>);
      overlay.emitInteractOutside(pointerVeto);

      expect(emitted.pointerDownOutside.length).toBe(1);
      expect(emitted.interactOutside.length).toBe(1);
      expect(emitted.pointerDownOutside[0]).toBe(pointerVeto);
      expect(emitted.interactOutside[0]).toBe(pointerVeto);
    });

    it('requestClose closes with the channel reason when dismissible', () => {
      const { overlay, hooks } = build();
      hooks.open.set(true);
      overlay.requestClose('focusOutside');
      expect(hooks.open()).toBe(false);
      expect(overlay.lastCloseReason()).toBe('focusOutside');
    });

    it('requestClose is ignored once the menu is already closed, preserving the close reason', () => {
      const { overlay, hooks } = build();
      overlay.closeMenu('tab');
      expect(hooks.open()).toBe(false);

      overlay.requestClose('pointerDownOutside');

      expect(overlay.lastCloseReason()).toBe('tab');
    });
  });

  describe('autoFocus veto', () => {
    it('emits and returns whether the consumer vetoed', () => {
      const { overlay, hooks } = build();
      let vetoed = overlay.emitAutoFocusOnOpen();
      expect(vetoed).toBe(false);

      hooks.autoFocusOnOpen.subscribe((e) => e.preventDefault());
      vetoed = overlay.emitAutoFocusOnOpen();
      expect(vetoed).toBe(true);
    });
  });
});

// Smoke check: the helpers exported alongside the class still work standalone.
describe('vetoable-event helpers (sanity)', () => {
  it('createVetoableEvent flips defaultPrevented', () => {
    const v = createVetoableEvent();
    expect(v.defaultPrevented).toBe(false);
    v.preventDefault();
    expect(v.defaultPrevented).toBe(true);
  });

  it('createVetoableNativeEvent carries the original event', () => {
    const event = new KeyboardEvent('keydown');
    const v = createVetoableNativeEvent(event);
    expect(v.event).toBe(event);
  });
});
