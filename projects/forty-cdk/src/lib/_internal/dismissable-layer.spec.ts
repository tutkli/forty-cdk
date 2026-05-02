import { DismissableLayer } from './dismissable-layer';

function escape(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
}

function pointerDown(target: Node): PointerEvent {
  const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event;
}

function focusIn(target: Node): FocusEvent {
  const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event;
}

describe('DismissableLayer', () => {
  let host: HTMLElement;
  let outside: HTMLElement;
  let layer: DismissableLayer | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'host';
    host.innerHTML = `<button id="inside">in</button>`;
    document.body.appendChild(host);

    outside = document.createElement('div');
    outside.id = 'outside';
    outside.innerHTML = `<button id="out">out</button>`;
    document.body.appendChild(outside);

    layer = null;
  });

  afterEach(() => {
    layer?.deactivate();
    document.body.innerHTML = '';
  });

  describe('escape', () => {
    it('invokes onEscapeKeyDown then onDismiss when Escape is pressed', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onEscapeKeyDown: () => calls.push('escape'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(escape());

      expect(calls).toEqual(['escape', 'dismiss']);
    });

    it('skips onDismiss when the handler calls preventDefault', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onEscapeKeyDown: (event) => {
          calls.push('escape');
          event.preventDefault();
        },
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(escape());

      expect(calls).toEqual(['escape']);
    });

    it('ignores other keys', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({ onEscapeKeyDown: () => calls.push('escape') });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(calls).toEqual([]);
    });
  });

  describe('pointer-down outside', () => {
    it('invokes onPointerDownOutside, onInteractOutside, onDismiss for pointers outside the host', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onPointerDownOutside: () => calls.push('pointer'),
        onInteractOutside: () => calls.push('interact'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['pointer', 'interact', 'dismiss']);
    });

    it('does not fire when the pointer goes down inside the host', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onPointerDownOutside: () => calls.push('pointer'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDown(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });

    it('treats descendants of exemptElements as inside', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        exemptElements: () => [outside],
        onPointerDownOutside: () => calls.push('pointer'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDown(outside.querySelector('#out')!));

      expect(calls).toEqual([]);
    });

    it('skips onDismiss when the handler calls preventDefault', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onPointerDownOutside: (event) => {
          calls.push('pointer');
          event.preventDefault();
        },
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['pointer']);
    });
  });

  describe('focus outside', () => {
    it('invokes onFocusOutside, onInteractOutside, onDismiss when focus moves outside', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onFocusOutside: () => calls.push('focus'),
        onInteractOutside: () => calls.push('interact'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(focusIn(outside));

      expect(calls).toEqual(['focus', 'interact', 'dismiss']);
    });

    it('does not fire when focus moves to a descendant of the host', () => {
      const calls: string[] = [];
      layer = new DismissableLayer(host);
      layer.activate({
        onFocusOutside: () => calls.push('focus'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(focusIn(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });
  });

  describe('layer stacking', () => {
    it('only invokes events on the topmost active layer', () => {
      const inner = document.createElement('div');
      document.body.appendChild(inner);

      const calls: string[] = [];
      const outerLayer = new DismissableLayer(host);
      outerLayer.activate({
        onEscapeKeyDown: () => calls.push('outer-escape'),
        onPointerDownOutside: () => calls.push('outer-pointer'),
      });
      const innerLayer = new DismissableLayer(inner);
      innerLayer.activate({
        onEscapeKeyDown: () => calls.push('inner-escape'),
        onPointerDownOutside: () => calls.push('inner-pointer'),
      });

      document.dispatchEvent(escape());
      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['inner-escape', 'inner-pointer']);

      innerLayer.deactivate();
      outerLayer.deactivate();
      inner.remove();
    });

    it('falls back to the next layer once the topmost deactivates', () => {
      const inner = document.createElement('div');
      document.body.appendChild(inner);

      const calls: string[] = [];
      const outerLayer = new DismissableLayer(host);
      outerLayer.activate({ onEscapeKeyDown: () => calls.push('outer') });
      const innerLayer = new DismissableLayer(inner);
      innerLayer.activate({ onEscapeKeyDown: () => calls.push('inner') });

      innerLayer.deactivate();
      document.dispatchEvent(escape());

      expect(calls).toEqual(['outer']);

      outerLayer.deactivate();
      inner.remove();
    });
  });

  it('is idempotent: activate twice has no extra effect', () => {
    const calls: string[] = [];
    layer = new DismissableLayer(host);
    layer.activate({ onEscapeKeyDown: () => calls.push('once') });
    layer.activate({ onEscapeKeyDown: () => calls.push('twice') });

    document.dispatchEvent(escape());

    expect(calls).toEqual(['once']);
    expect(layer.isActive).toBe(true);
  });

  it('detaches all listeners on deactivate', () => {
    const calls: string[] = [];
    layer = new DismissableLayer(host);
    layer.activate({ onEscapeKeyDown: () => calls.push('escape') });
    layer.deactivate();

    document.dispatchEvent(escape());

    expect(calls).toEqual([]);
    expect(layer.isActive).toBe(false);
  });
});
