import { FocusTrap } from './focus-trap';

function tab(shift = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
}

describe('FocusTrap', () => {
  let container: HTMLElement;
  let outsideBefore: HTMLButtonElement;
  let outsideAfter: HTMLButtonElement;
  let trap: FocusTrap | null = null;

  beforeEach(() => {
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
    trap = new FocusTrap(container);
    trap.activate();

    expect(document.activeElement?.id).toBe('b1');
  });

  it('focuses the container itself when initialFocus is "container"', () => {
    trap = new FocusTrap(container);
    trap.activate({ initialFocus: 'container' });

    expect(document.activeElement).toBe(container);
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('focuses an explicit element when passed', () => {
    trap = new FocusTrap(container);
    const second = container.querySelector<HTMLElement>('#b2')!;
    trap.activate({ initialFocus: second });

    expect(document.activeElement).toBe(second);
  });

  it('cycles forward from the last focusable to the first on Tab', () => {
    trap = new FocusTrap(container);
    trap.activate();
    const last = container.querySelector<HTMLElement>('#b3')!;
    last.focus();

    document.dispatchEvent(tab());
    expect(document.activeElement?.id).toBe('b1');
  });

  it('cycles backward from the first to the last on Shift+Tab', () => {
    trap = new FocusTrap(container);
    trap.activate();
    const first = container.querySelector<HTMLElement>('#b1')!;
    first.focus();

    document.dispatchEvent(tab(true));
    expect(document.activeElement?.id).toBe('b3');
  });

  it('does nothing on Tab in the middle (lets browser handle it)', () => {
    trap = new FocusTrap(container);
    trap.activate();
    const middle = container.querySelector<HTMLElement>('#b2')!;
    middle.focus();

    const event = tab();
    document.dispatchEvent(event);
    // Trap should NOT preventDefault when focus would stay inside.
    expect(event.defaultPrevented).toBe(false);
  });

  it('pulls focus back inside if Tab fires while focus is outside the trap', () => {
    trap = new FocusTrap(container);
    trap.activate();
    outsideBefore.focus();

    document.dispatchEvent(tab());
    expect(document.activeElement?.id).toBe('b1');
  });

  it('returns focus to the previously focused element on deactivate', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container);
    trap.activate();
    expect(document.activeElement?.id).toBe('b1');

    trap.deactivate();
    expect(document.activeElement).toBe(outsideBefore);
  });

  it('skips return focus when returnFocus: false', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container);
    trap.activate();
    trap.deactivate({ returnFocus: false });

    expect(document.activeElement).not.toBe(outsideBefore);
  });

  it('removes the temporary container tabindex when deactivating', () => {
    trap = new FocusTrap(container);
    trap.activate({ initialFocus: 'container' });
    expect(container.getAttribute('tabindex')).toBe('-1');

    trap.deactivate();
    expect(container.hasAttribute('tabindex')).toBe(false);
  });

  it('preserves a pre-existing container tabindex on deactivate', () => {
    container.setAttribute('tabindex', '-1');
    trap = new FocusTrap(container);
    trap.activate({ initialFocus: 'container' });
    trap.deactivate();

    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('skips disabled and hidden focusables', () => {
    container.innerHTML = `
      <button id="b1" disabled>disabled</button>
      <button id="b2" hidden>hidden</button>
      <button id="b3">three</button>
    `;
    trap = new FocusTrap(container);
    trap.activate();

    expect(document.activeElement?.id).toBe('b3');
  });

  it('falls back to focusing the container when no focusables exist', () => {
    container.innerHTML = '';
    trap = new FocusTrap(container);
    trap.activate();

    expect(document.activeElement).toBe(container);
  });

  it('is idempotent: activate twice has no extra effect', () => {
    outsideBefore.focus();
    trap = new FocusTrap(container);
    trap.activate();
    const firstActive = document.activeElement;
    trap.activate();
    expect(document.activeElement).toBe(firstActive);
    expect(trap.isActive).toBe(true);
  });

  it('exposes the underlying container', () => {
    trap = new FocusTrap(container);
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

      trap = new FocusTrap(container);
      trap.activate({ returnFocus: explicitTarget });
      trap.deactivate();

      expect(document.activeElement).toBe(explicitTarget);
    });

    it('treats null override as "no return target" (no focus restore on deactivate)', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container);
      trap.activate({ returnFocus: null });
      trap.deactivate();

      // Trap focused #b1 on activate; deactivate with no returnTo leaves
      // focus where it is.
      expect(document.activeElement?.id).toBe('b1');
    });

    it('falls back to document.activeElement when returnFocus is omitted', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container);
      trap.activate();
      trap.deactivate();

      expect(document.activeElement).toBe(outsideBefore);
    });
  });

  describe('preventInitialFocus', () => {
    it('does not move focus on activate when set', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container);
      trap.activate({ preventInitialFocus: true });

      expect(document.activeElement).toBe(outsideBefore);
      expect(trap.isActive).toBe(true);
    });

    it('still cycles Tab from the last focusable to the first once focus enters', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container);
      trap.activate({ preventInitialFocus: true });

      const last = container.querySelector<HTMLElement>('#b3')!;
      last.focus();
      document.dispatchEvent(tab());
      expect(document.activeElement?.id).toBe('b1');
    });

    it('still returns focus to the previously focused element on deactivate', () => {
      outsideBefore.focus();
      trap = new FocusTrap(container);
      trap.activate({ preventInitialFocus: true });
      // Move focus inside afterwards.
      const middle = container.querySelector<HTMLElement>('#b2')!;
      middle.focus();
      trap.deactivate();

      expect(document.activeElement).toBe(outsideBefore);
    });
  });
});
