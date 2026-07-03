import { FocusTrap, FocusTrapStack } from './focus-trap';

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
  });
});
