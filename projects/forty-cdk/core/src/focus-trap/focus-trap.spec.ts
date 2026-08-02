import { Component, DestroyRef, Directive, inject, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { nextMacrotask, renderHost } from '../../../src/test-utils';
import { findFirstFocusable, FocusTrap, FocusTrapStack, injectFocusTrap } from './focus-trap';

function tab(shift = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
}

function flushMutationObserver(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('FocusTrap', () => {
  let container: HTMLElement;
  let outsideBefore: HTMLButtonElement;
  let outsideAfter: HTMLButtonElement;
  let trap: FocusTrap | null = null;
  let stack: FocusTrapStack;

  beforeEach(() => {
    stack = new FocusTrapStack();
    document.body.innerHTML = '';
    outsideBefore = document.createElement('button');
    outsideBefore.id = 'before';
    outsideBefore.textContent = 'before';
    document.body.appendChild(outsideBefore);

    container = document.createElement('div');
    container.id = 'trap';
    container.innerHTML = `
      <button id="b1">one</button>
      <button id="b2">two</button>
      <button id="b3">three</button>
    `;
    document.body.appendChild(container);

    outsideAfter = document.createElement('button');
    outsideAfter.id = 'after';
    outsideAfter.textContent = 'after';
    document.body.appendChild(outsideAfter);

    trap = null;
  });

  afterEach(() => {
    trap?.deactivate({ returnFocus: false });
    document.body.innerHTML = '';
  });

  it('focuses the first focusable on activate by default', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container, stack);
    trap.activate();

    expect(document.activeElement?.id).toBe('b1');
  });

  it('focuses the container itself when initialFocus is "container"', () => {
    trap = new FocusTrap(container, stack);
    trap.activate({ initialFocus: 'container' });

    expect(document.activeElement).toBe(container);
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('focuses an explicit element when passed', () => {
    trap = new FocusTrap(container, stack);
    const second = container.querySelector<HTMLElement>('#b2')!;
    trap.activate({ initialFocus: second });

    expect(document.activeElement).toBe(second);
  });

  it('activate() is a no-op off-browser and adds no document keydown listener', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    trap = new FocusTrap(container, stack, undefined, false);
    trap.activate();

    expect(trap.isActive).toBe(false);
    expect(addSpy.mock.calls.filter(([type]) => type === 'keydown')).toEqual([]);
  });

  it('cycles forward from the last focusable to the first on Tab', () => {
    trap = new FocusTrap(container, stack);
    trap.activate();
    const last = container.querySelector<HTMLElement>('#b3')!;
    last.focus();

    document.dispatchEvent(tab());
    expect(document.activeElement?.id).toBe('b1');
  });

  it('cycles backward from the first to the last on Shift+Tab', () => {
    trap = new FocusTrap(container, stack);
    trap.activate();
    const first = container.querySelector<HTMLElement>('#b1')!;
    first.focus();

    document.dispatchEvent(tab(true));
    expect(document.activeElement?.id).toBe('b3');
  });

  it('does nothing on Tab in the middle (lets browser handle it)', () => {
    trap = new FocusTrap(container, stack);
    trap.activate();
    const middle = container.querySelector<HTMLElement>('#b2')!;
    middle.focus();

    const event = tab();
    document.dispatchEvent(event);
    // Trap should NOT preventDefault when focus would stay inside.
    expect(event.defaultPrevented).toBe(false);
  });

  it('pulls focus back inside if Tab fires while focus is outside the trap', () => {
    trap = new FocusTrap(container, stack);
    trap.activate();
    outsideBefore.focus();

    document.dispatchEvent(tab());
    expect(document.activeElement?.id).toBe('b1');
  });

  it('returns focus to the previously focused element on deactivate', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container, stack);
    trap.activate();
    expect(document.activeElement?.id).toBe('b1');

    trap.deactivate();
    expect(document.activeElement).toBe(outsideBefore);
  });

  it('skips return focus when returnFocus: false', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container, stack);
    trap.activate();
    trap.deactivate({ returnFocus: false });

    expect(document.activeElement).not.toBe(outsideBefore);
  });

  it('removes the temporary container tabindex when deactivating', () => {
    trap = new FocusTrap(container, stack);
    trap.activate({ initialFocus: 'container' });
    expect(container.getAttribute('tabindex')).toBe('-1');

    trap.deactivate();
    expect(container.hasAttribute('tabindex')).toBe(false);
  });

  it('preserves a pre-existing container tabindex on deactivate', () => {
    container.setAttribute('tabindex', '-1');
    trap = new FocusTrap(container, stack);
    trap.activate({ initialFocus: 'container' });
    trap.deactivate();

    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('preserves a pre-existing container tabindex when initial focus lands on a descendant', () => {
    container.setAttribute('tabindex', '-1');
    trap = new FocusTrap(container, stack);
    trap.activate();
    expect(document.activeElement?.id).toBe('b1');

    trap.deactivate();
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('does not leak a temporary container tabindex on repeated Tab in an empty trap', () => {
    container.setAttribute('tabindex', '-1');
    container.innerHTML = '';
    trap = new FocusTrap(container, stack);
    trap.activate();

    document.dispatchEvent(tab());
    document.dispatchEvent(tab());

    trap.deactivate();
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('skips disabled and hidden focusables', () => {
    container.innerHTML = `
      <button id="b1" disabled>disabled</button>
      <button id="b2" hidden>hidden</button>
      <button id="b3">three</button>
    `;
    trap = new FocusTrap(container, stack);
    trap.activate();

    expect(document.activeElement?.id).toBe('b3');
  });

  it('falls back to focusing the container when no focusables exist', () => {
    container.innerHTML = '';
    trap = new FocusTrap(container, stack);
    trap.activate();

    expect(document.activeElement).toBe(container);
  });

  it('is idempotent: activate twice has no extra effect', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container, stack);
    trap.activate();
    const firstActive = document.activeElement;
    trap.activate();
    expect(document.activeElement).toBe(firstActive);
    expect(trap.isActive).toBe(true);
  });

  it('exposes the underlying container', () => {
    trap = new FocusTrap(container, stack);
    expect(trap.container).toBe(container);
  });

  describe('returnFocus override', () => {
    it('restores focus to the explicit target on deactivate, ignoring document.activeElement at activation', () => {
      // Simulates the ForDialog scenario: WebKit blurs the trigger before
      // the trap captures activeElement, so the consumer captures it
      // earlier and forwards it via the override.
      const explicitTarget = outsideBefore;
      // Pretend the inert side-effect blurred the trigger between capture
      // and activate — activeElement is now body.
      (document.body as HTMLElement).focus();
      expect(document.activeElement).toBe(document.body);

      trap = new FocusTrap(container, stack);
      trap.activate({ returnFocus: explicitTarget });
      trap.deactivate();

      expect(document.activeElement).toBe(explicitTarget);
    });

    it('treats null override as "no return target" (no focus restore on deactivate)', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container, stack);
      trap.activate({ returnFocus: null });
      trap.deactivate();

      // Trap focused #b1 on activate; deactivate with no returnTo leaves
      // focus where it is.
      expect(document.activeElement?.id).toBe('b1');
    });

    it('falls back to document.activeElement when returnFocus is omitted', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container, stack);
      trap.activate();
      trap.deactivate();

      expect(document.activeElement).toBe(outsideBefore);
    });
  });

  describe('LIFO with nested traps', () => {
    let inner: HTMLElement;
    let innerTrap: FocusTrap | null;

    beforeEach(() => {
      inner = document.createElement('div');
      inner.id = 'inner-trap';
      inner.innerHTML = `
        <button id="i1">inner one</button>
        <button id="i2">inner two</button>
      `;
      // Inner trap is a sibling of the outer container in the DOM, mirroring
      // how the drawer primitive portals each layer to body. The outer trap
      // does NOT contain the inner buttons.
      document.body.appendChild(inner);
      innerTrap = null;
    });

    afterEach(() => {
      innerTrap?.deactivate({ returnFocus: false });
      inner.remove();
    });

    it('only the topmost trap handles Tab while a deeper trap is active', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      innerTrap = new FocusTrap(inner, stack);
      innerTrap.activate();

      const i2 = inner.querySelector<HTMLElement>('#i2')!;
      i2.focus();

      // Tab from inner's last → wraps to inner's first (NOT pulled back into outer).
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('i1');
    });

    it('outer trap does not pull focus back when the inner trap owns it', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      innerTrap = new FocusTrap(inner, stack);
      innerTrap.activate();

      const i1 = inner.querySelector<HTMLElement>('#i1')!;
      i1.focus();

      // Outer's container does not contain `i1`; without LIFO awareness the
      // outer would treat this as "focus jumped outside" and yank it back.
      document.dispatchEvent(tab(true));
      expect(document.activeElement?.id).toBe('i2');
    });

    it('outer trap resumes once the inner trap deactivates', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      innerTrap = new FocusTrap(inner, stack);
      innerTrap.activate();
      innerTrap.deactivate({ returnFocus: false });
      innerTrap = null;

      const last = container.querySelector<HTMLElement>('#b3')!;
      last.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');
    });
  });

  describe('preventInitialFocus', () => {
    it('does not move focus on activate when set', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container, stack);
      trap.activate({ preventInitialFocus: true });

      expect(document.activeElement).toBe(outsideBefore);
      expect(trap.isActive).toBe(true);
    });

    it('still cycles Tab from the last focusable to the first once focus enters', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container, stack);
      trap.activate({ preventInitialFocus: true });

      const last = container.querySelector<HTMLElement>('#b3')!;
      last.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');
    });

    it('still returns focus to the previously focused element on deactivate', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container, stack);
      trap.activate({ preventInitialFocus: true });
      // Move focus inside afterwards.
      const middle = container.querySelector<HTMLElement>('#b2')!;
      middle.focus();
      trap.deactivate();

      expect(document.activeElement).toBe(outsideBefore);
    });
  });

  describe('per-injector stack isolation', () => {
    let outerTrap: FocusTrap | null;
    let innerTrap: FocusTrap | null;
    let outer: HTMLElement;

    beforeEach(() => {
      // `outer` wraps the shared `container`, with extra focusables before and
      // after it, so that `container`'s #b1/#b3 sit in the *middle* of
      // `outer`'s focusable list (never `outer`'s first/last). A Tab fired
      // while focus is inside `container` is therefore a no-op for a trap on
      // `outer` — it only acts when focus is at its own edges or outside it.
      outer = document.createElement('div');
      outer.id = 'outer-trap';
      const before = document.createElement('button');
      before.id = 'o-before';
      const after = document.createElement('button');
      after.id = 'o-after';
      container.replaceWith(outer);
      outer.appendChild(before);
      outer.appendChild(container);
      outer.appendChild(after);
      outerTrap = null;
      innerTrap = null;
    });

    afterEach(() => {
      outerTrap?.deactivate({ returnFocus: false });
      innerTrap?.deactivate({ returnFocus: false });
    });

    it('two independent stacks do not cross-shadow: the inner trap stays topmost on its own stack even though the outer trap activated last on a different stack', () => {
      const inner = new FocusTrapStack();
      const outerStack = new FocusTrapStack();

      // Inner trap activates first on its own stack; outer trap activates
      // LAST on a different stack. With a single shared module-level stack,
      // the outer (activated last) would be the only topmost trap and shadow
      // the inner — so the inner's Tab handler would bail, leaving focus at
      // #b3 (the outer, seeing #b3 in its middle, does nothing). With
      // per-injector stacks the inner is topmost on its own stack and cycles.
      innerTrap = new FocusTrap(container, inner);
      innerTrap.activate();

      outerTrap = new FocusTrap(outer, outerStack);
      outerTrap.activate();

      const last = container.querySelector<HTMLElement>('#b3')!;
      last.focus();
      document.dispatchEvent(tab());

      expect(document.activeElement?.id).toBe('b1');
    });
  });

  describe('focusables cache invalidation', () => {
    it('includes a focusable appended after activation once the observer fires', async () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const b3 = container.querySelector<HTMLElement>('#b3')!;
      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');

      const appended = document.createElement('button');
      appended.id = 'b4';
      appended.textContent = 'four';
      container.appendChild(appended);
      await flushMutationObserver();

      appended.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');

      const b1 = container.querySelector<HTMLElement>('#b1')!;
      b1.focus();
      document.dispatchEvent(tab(true));
      expect(document.activeElement?.id).toBe('b4');
    });

    it('excludes a focusable disabled after activation once the observer fires', async () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const b1 = container.querySelector<HTMLButtonElement>('#b1')!;
      const b3 = container.querySelector<HTMLElement>('#b3')!;

      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');

      b1.disabled = true;
      await flushMutationObserver();

      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b2');
    });
  });

  describe('CSS-hidden candidates', () => {
    it('skips a display:none focusable on activate', () => {
      container.innerHTML = `
        <button id="b1" style="display:none">hidden</button>
        <button id="b2">two</button>
        <button id="b3">three</button>
      `;
      trap = new FocusTrap(container, stack);
      trap.activate();

      expect(document.activeElement?.id).toBe('b2');
    });

    it('skips a visibility:hidden focusable on activate', () => {
      container.innerHTML = `
        <button id="b1" style="visibility:hidden">hidden</button>
        <button id="b2">two</button>
      `;
      trap = new FocusTrap(container, stack);
      trap.activate();

      expect(document.activeElement?.id).toBe('b2');
    });

    it('skips a focusable nested inside a display:none ancestor', () => {
      container.innerHTML = `
        <div style="display:none"><button id="b1">hidden</button></div>
        <button id="b2">two</button>
      `;
      trap = new FocusTrap(container, stack);
      trap.activate();

      expect(document.activeElement?.id).toBe('b2');
    });

    it('cycles Tab between the visible focusables when the first and last are CSS-hidden', () => {
      container.innerHTML = `
        <button id="b1" style="display:none">hidden first</button>
        <button id="b2">two</button>
        <button id="b3">three</button>
        <button id="b4" style="display:none">hidden last</button>
      `;
      trap = new FocusTrap(container, stack);
      trap.activate();
      expect(document.activeElement?.id).toBe('b2');

      const b3 = container.querySelector<HTMLElement>('#b3')!;
      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b2');

      const b2 = container.querySelector<HTMLElement>('#b2')!;
      b2.focus();
      document.dispatchEvent(tab(true));
      expect(document.activeElement?.id).toBe('b3');
    });

    it('excludes a focusable hidden via CSS after activation once the observer fires', async () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const b1 = container.querySelector<HTMLElement>('#b1')!;
      const b3 = container.querySelector<HTMLElement>('#b3')!;

      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');

      b1.style.display = 'none';
      await flushMutationObserver();

      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b2');
    });

    it('does not escape when the last tabbable is CSS-hidden by a container-external class flip', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const b1 = container.querySelector<HTMLElement>('#b1')!;
      b1.focus();
      document.dispatchEvent(tab(true));
      expect(document.activeElement?.id).toBe('b3');

      const sheet = document.createElement('style');
      sheet.textContent = '.for-compact #trap #b3{display:none}';
      document.head.appendChild(sheet);
      document.body.classList.add('for-compact');
      try {
        const b2 = container.querySelector<HTMLElement>('#b2')!;
        b2.focus();
        const event = tab();
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement?.id).toBe('b1');
      } finally {
        document.body.classList.remove('for-compact');
        sheet.remove();
      }
    });

    it('does not escape when the first tabbable is CSS-hidden by a container-external class flip', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const b3 = container.querySelector<HTMLElement>('#b3')!;
      b3.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');

      const sheet = document.createElement('style');
      sheet.textContent = '.for-compact #trap #b1{display:none}';
      document.head.appendChild(sheet);
      document.body.classList.add('for-compact');
      try {
        const b2 = container.querySelector<HTMLElement>('#b2')!;
        b2.focus();
        const event = tab(true);
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(document.activeElement?.id).toBe('b3');
      } finally {
        document.body.classList.remove('for-compact');
        sheet.remove();
      }
    });
  });

  describe('tabbable endpoints exclude tabindex="-1" candidates', () => {
    beforeEach(() => {
      container.innerHTML = `
        <button id="t1">tabbable one</button>
        <button id="rov1" tabindex="-1">roving non-tabbable</button>
        <button id="t2">tabbable two</button>
        <button id="rov2" tabindex="-1">roving non-tabbable last</button>
      `;
    });

    it('wraps forward from the last tabbable to the first, skipping trailing tabindex="-1" items', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const t2 = container.querySelector<HTMLElement>('#t2')!;
      t2.focus();
      document.dispatchEvent(tab());

      expect(document.activeElement?.id).toBe('t1');
    });

    it('wraps backward from the first tabbable to the last, skipping tabindex="-1" items', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const t1 = container.querySelector<HTMLElement>('#t1')!;
      t1.focus();
      document.dispatchEvent(tab(true));

      expect(document.activeElement?.id).toBe('t2');
    });

    it('treats a tabindex="-1" item at a Tab edge as a middle element (no wrap)', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();

      const rov2 = container.querySelector<HTMLElement>('#rov2')!;
      rov2.focus();
      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('open shadow roots inside the trap', () => {
    let shadow: ShadowRoot;

    beforeEach(() => {
      container.innerHTML = `
        <button id="light-first">light first</button>
        <shadow-widget id="host"></shadow-widget>
      `;
      const host = container.querySelector<HTMLElement>('#host')!;
      shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <button id="shadow-a">shadow a</button>
        <button id="shadow-b">shadow b</button>
      `;
    });

    function shadowButton(id: string): HTMLElement {
      return shadow.querySelector<HTMLElement>(`#${id}`)!;
    }

    it('wraps forward from a shadow-nested last tabbable instead of letting focus escape', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();
      shadowButton('shadow-b').focus();

      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.id).toBe('light-first');
    });

    it('wraps backward from the first tabbable into the shadow root', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();
      container.querySelector<HTMLElement>('#light-first')!.focus();

      const event = tab(true);
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(shadow.activeElement?.id).toBe('shadow-b');
    });

    it('lets the browser move focus between two shadow-nested tabbables', () => {
      trap = new FocusTrap(container, stack);
      trap.activate();
      shadowButton('shadow-a').focus();

      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('cycles a trap whose only tabbables live inside the shadow root', () => {
      container.querySelector('#light-first')!.remove();
      trap = new FocusTrap(container, stack);
      trap.activate();
      shadowButton('shadow-b').focus();

      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(shadow.activeElement?.id).toBe('shadow-a');
    });

    it('focuses the first shadow-nested focusable on activate', () => {
      container.querySelector('#light-first')!.remove();
      trap = new FocusTrap(container, stack);
      trap.activate();

      expect(shadow.activeElement?.id).toBe('shadow-a');
      expect(container.hasAttribute('tabindex')).toBe(false);
    });

    it('skips a shadow-nested candidate whose host is inert', () => {
      container.querySelector('#light-first')!.remove();
      container.querySelector('#host')!.setAttribute('inert', '');
      trap = new FocusTrap(container, stack);
      trap.activate();

      expect(shadow.activeElement).toBeNull();
      expect(document.activeElement).toBe(container);
    });

    it('returns focus to a shadow-nested element captured at activation', () => {
      const outerHost = document.createElement('shadow-widget');
      document.body.appendChild(outerHost);
      const outerShadow = outerHost.attachShadow({ mode: 'open' });
      outerShadow.innerHTML = '<button id="outer-inner">outer</button>';
      outerShadow.querySelector<HTMLElement>('#outer-inner')!.focus();

      trap = new FocusTrap(container, stack);
      trap.activate();
      expect(document.activeElement?.id).toBe('light-first');

      trap.deactivate();

      expect(outerShadow.activeElement?.id).toBe('outer-inner');
    });
  });

  describe('focusable selector includes iframe and summary', () => {
    it('includes an <iframe> in the focusable set', () => {
      container.innerHTML = `<iframe id="frame" title="embedded"></iframe>`;
      const frame = container.querySelector<HTMLElement>('#frame')!;

      expect(findFirstFocusable(container)).toBe(frame);
    });

    it('includes a <summary> inside <details> in the focusable set', () => {
      container.innerHTML = `
        <details>
          <summary id="sum">details summary</summary>
          <p>body</p>
        </details>
      `;
      const summary = container.querySelector<HTMLElement>('#sum')!;

      expect(findFirstFocusable(container)).toBe(summary);
    });
  });

  describe('return focus when the target is disconnected', () => {
    it('does not throw and does not focus a disconnected node on deactivate', () => {
      const returnTarget = document.createElement('button');
      returnTarget.id = 'return-target';
      document.body.appendChild(returnTarget);
      returnTarget.focus();

      trap = new FocusTrap(container, stack);
      trap.activate();
      expect(document.activeElement?.id).toBe('b1');

      returnTarget.remove();

      expect(() => trap!.deactivate()).not.toThrow();
      expect(document.activeElement).not.toBe(returnTarget);
      expect(returnTarget.isConnected).toBe(false);
      expect(document.activeElement?.id).toBe('b1');
    });
  });

  describe('injectFocusTrap teardown safety net', () => {
    let fixture: ComponentFixture<unknown> | null = null;

    afterEach(() => {
      fixture?.destroy();
      fixture = null;
    });

    interface MountTrapOwnerOptions {
      deactivateOnDestroy?: 'before-trap' | 'after-trap';
    }

    function mountTrapOwner({ deactivateOnDestroy }: MountTrapOwnerOptions = {}) {
      let captured: FocusTrap | null = null;

      @Directive({ selector: '[trapOwner]' })
      class TrapOwner {
        constructor() {
          const destroyRef = inject(DestroyRef);
          if (deactivateOnDestroy === 'before-trap') {
            destroyRef.onDestroy(() => captured?.deactivate({ returnFocus: true }));
          }
          const trap = injectFocusTrap();
          captured = trap;
          if (deactivateOnDestroy === 'after-trap') {
            destroyRef.onDestroy(() => trap.deactivate({ returnFocus: true }));
          }
        }
      }

      @Component({
        standalone: true,
        imports: [TrapOwner],
        template: `
          @if (mounted()) {
            <div trapOwner id="owned">
              <button id="owned-1">one</button>
              <button id="owned-2">two</button>
            </div>
          }
        `,
      })
      class Host {
        readonly mounted = signal(true);
      }

      const r = renderHost(Host);
      fixture = r.fixture;

      return {
        trap: captured!,
        unmount: () => {
          r.instance.mounted.set(false);
          r.fixture.detectChanges();
        },
      };
    }

    it('removes the document keydown listener when the owner is destroyed without deactivating', () => {
      const owner = mountTrapOwner();
      owner.trap.activate();

      owner.unmount();

      outsideBefore.focus();
      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(outsideBefore);
    });

    it('releases the stack entry so a shadowed trap resumes handling Tab', () => {
      const owner = mountTrapOwner();
      trap = new FocusTrap(container, TestBed.inject(FocusTrapStack));
      trap.activate();
      owner.trap.activate();

      owner.unmount();

      const last = container.querySelector<HTMLElement>('#b3')!;
      last.focus();
      document.dispatchEvent(tab());

      expect(document.activeElement?.id).toBe('b1');
    });

    it('never moves focus itself', () => {
      outsideBefore.focus();
      const owner = mountTrapOwner();
      owner.trap.activate({ preventInitialFocus: true });
      outsideAfter.focus();

      owner.unmount();

      expect(document.activeElement).toBe(outsideAfter);
    });

    it("does not swallow the owner's return-focus deactivate registered after it", () => {
      outsideBefore.focus();
      const owner = mountTrapOwner({ deactivateOnDestroy: 'after-trap' });
      owner.trap.activate();
      expect(document.activeElement?.id).toBe('owned-1');

      owner.unmount();

      expect(document.activeElement).toBe(outsideBefore);
    });

    it("runs second, harmlessly, after an owner's deactivate registered before it", () => {
      outsideBefore.focus();
      const owner = mountTrapOwner({ deactivateOnDestroy: 'before-trap' });
      owner.trap.activate();
      expect(document.activeElement?.id).toBe('owned-1');

      owner.unmount();

      expect(document.activeElement).toBe(outsideBefore);

      const event = tab();
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(outsideBefore);
    });

    describe('dev-mode warning when the net fires', () => {
      let warned: string[];

      beforeEach(() => {
        warned = [];
        vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
          warned.push(args.map(String).join(' '));
        });
      });

      it('warns when the owner is destroyed without ever deactivating', async () => {
        const owner = mountTrapOwner();
        owner.trap.activate();

        owner.unmount();
        await Promise.resolve();

        expect(warned).toHaveLength(1);
        expect(warned[0]).toContain('[forty-cdk/core] injectFocusTrap');
        expect(warned[0]).toContain('`trap.deactivate({ returnFocus })`');
        expect(warned[0]).toContain('`DestroyRef.onDestroy`');
      });

      it('stays silent for an owner whose deactivate hook is registered after injectFocusTrap()', async () => {
        const owner = mountTrapOwner({ deactivateOnDestroy: 'after-trap' });
        owner.trap.activate();

        owner.unmount();
        await Promise.resolve();

        expect(warned).toEqual([]);
      });

      it('stays silent for an owner whose deactivate hook is registered before injectFocusTrap()', async () => {
        const owner = mountTrapOwner({ deactivateOnDestroy: 'before-trap' });
        owner.trap.activate();

        owner.unmount();
        await Promise.resolve();

        expect(warned).toEqual([]);
      });

      it('schedules nothing for a trap that was never activated', async () => {
        const owner = mountTrapOwner();
        const scheduled = vi.spyOn(globalThis, 'queueMicrotask');

        owner.unmount();

        expect(scheduled).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(warned).toEqual([]);
      });

      it('warns once per trap, however many microtask hops follow', async () => {
        const owner = mountTrapOwner();
        owner.trap.activate();

        owner.unmount();
        await Promise.resolve();
        await Promise.resolve();
        await nextMacrotask();

        expect(warned).toHaveLength(1);
      });

      it('registers nothing once `ngDevMode` is cleared, as a production build does', async () => {
        vi.stubGlobal('ngDevMode', false);
        const owner = mountTrapOwner();
        owner.trap.activate();
        const scheduled = vi.spyOn(globalThis, 'queueMicrotask');

        owner.unmount();

        expect(scheduled).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(warned).toEqual([]);
      });
    });
  });
});
