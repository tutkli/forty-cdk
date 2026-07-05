import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { pressKey } from '../../../src/test-utils';
import { DismissableLayer, DismissableLayerStack } from './dismissable-layer';

function pointerDown(target: Node): PointerEvent {
  const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  // A real dispatched event's `composedPath()` starts at the originating node;
  // the synthetic event above only overrides `target`, so mirror it on the path
  // too (the layer reads `composedPath()[0]` first for shadow-DOM correctness).
  Object.defineProperty(event, 'composedPath', { value: () => [target], configurable: true });
  return event;
}

function pointerDownComposed(retargeted: Node, path: readonly Node[]): PointerEvent {
  const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: retargeted, configurable: true });
  Object.defineProperty(event, 'composedPath', { value: () => [...path], configurable: true });
  return event;
}

function focusIn(target: Node): FocusEvent {
  const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  Object.defineProperty(event, 'composedPath', { value: () => [target], configurable: true });
  return event;
}

function makeLayer(host: HTMLElement): DismissableLayer {
  return new DismissableLayer(host, TestBed.inject(DismissableLayerStack));
}

describe('DismissableLayer', () => {
  let host: HTMLElement;
  let outside: HTMLElement;
  let layer: DismissableLayer | null = null;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
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
      layer = makeLayer(host);
      layer.activate({
        onEscapeKeyDown: () => calls.push('escape'),
        onDismiss: () => calls.push('dismiss'),
      });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['escape', 'dismiss']);
    });

    it('skips onDismiss when the handler calls preventDefault', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        onEscapeKeyDown: (event) => {
          calls.push('escape');
          event.preventDefault();
        },
        onDismiss: () => calls.push('dismiss'),
      });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['escape']);
    });

    it('ignores other keys', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ onEscapeKeyDown: () => calls.push('escape') });

      pressKey(document, 'Enter');

      expect(calls).toEqual([]);
    });
  });

  describe('pointer-down outside', () => {
    it('invokes onPointerDownOutside, onInteractOutside, onDismiss for pointers outside the host', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
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
      layer = makeLayer(host);
      layer.activate({
        onPointerDownOutside: () => calls.push('pointer'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDown(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });

    it('treats descendants of exemptElements as inside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
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
      layer = makeLayer(host);
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

    it('uses composedPath()[0] over a retargeted target so a shadow-DOM pointer inside the host counts as inside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        onPointerDownOutside: () => calls.push('pointer'),
        onDismiss: () => calls.push('dismiss'),
      });

      const inside = host.querySelector('#inside')!;
      // `target` is retargeted to `outside` (as a shadow host would be), but the
      // real originating node in the composed path is inside the layer host.
      document.dispatchEvent(pointerDownComposed(outside, [inside, host]));

      expect(calls).toEqual([]);
    });

    it('falls back to event.target when composedPath is empty', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        onPointerDownOutside: () => calls.push('pointer'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(pointerDownComposed(outside, []));

      expect(calls).toEqual(['pointer', 'dismiss']);
    });
  });

  describe('focus outside', () => {
    it('invokes onFocusOutside, onInteractOutside, onDismiss when focus moves outside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
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
      layer = makeLayer(host);
      layer.activate({
        onFocusOutside: () => calls.push('focus'),
        onDismiss: () => calls.push('dismiss'),
      });

      document.dispatchEvent(focusIn(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });

    it('still dismisses when a nested element stops focusin propagation on the bubble phase', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        onFocusOutside: () => calls.push('focus'),
        onDismiss: () => calls.push('dismiss'),
      });

      const target = outside.querySelector('#out')!;
      const stop = (event: Event): void => event.stopPropagation();
      outside.addEventListener('focusin', stop);
      try {
        target.dispatchEvent(new FocusEvent('focusin', { bubbles: true, cancelable: true }));
      } finally {
        outside.removeEventListener('focusin', stop);
      }

      expect(calls).toEqual(['focus', 'dismiss']);
    });
  });

  describe('layer stacking', () => {
    it('only invokes events on the topmost active layer', () => {
      const inner = document.createElement('div');
      document.body.appendChild(inner);

      const calls: string[] = [];
      const outerLayer = makeLayer(host);
      outerLayer.activate({
        onEscapeKeyDown: () => calls.push('outer-escape'),
        onPointerDownOutside: () => calls.push('outer-pointer'),
      });
      const innerLayer = makeLayer(inner);
      innerLayer.activate({
        onEscapeKeyDown: () => calls.push('inner-escape'),
        onPointerDownOutside: () => calls.push('inner-pointer'),
      });

      pressKey(document, 'Escape');
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
      const outerLayer = makeLayer(host);
      outerLayer.activate({ onEscapeKeyDown: () => calls.push('outer') });
      const innerLayer = makeLayer(inner);
      innerLayer.activate({ onEscapeKeyDown: () => calls.push('inner') });

      innerLayer.deactivate();
      pressKey(document, 'Escape');

      expect(calls).toEqual(['outer']);

      outerLayer.deactivate();
      inner.remove();
    });
  });

  it('is idempotent: activate twice has no extra effect', () => {
    const calls: string[] = [];
    layer = makeLayer(host);
    layer.activate({ onEscapeKeyDown: () => calls.push('once') });
    layer.activate({ onEscapeKeyDown: () => calls.push('twice') });

    pressKey(document, 'Escape');

    expect(calls).toEqual(['once']);
    expect(layer.isActive).toBe(true);
  });

  it('detaches all listeners on deactivate', () => {
    const calls: string[] = [];
    layer = makeLayer(host);
    layer.activate({ onEscapeKeyDown: () => calls.push('escape') });
    layer.deactivate();

    pressKey(document, 'Escape');

    expect(calls).toEqual([]);
    expect(layer.isActive).toBe(false);
  });

  it('document listeners are removed when the application injector is destroyed', () => {
    layer = makeLayer(host);
    const calls: string[] = [];
    layer.activate({ onEscapeKeyDown: () => calls.push('escape') });
    pressKey(document, 'Escape');
    expect(calls).toEqual(['escape']);

    // Tear the injector down. The next bootstrap should install exactly
    // one fresh set of listeners; the previous one must be gone.
    TestBed.resetTestingModule();
    pressKey(document, 'Escape');
    // Listener on the previous injector is gone — no extra invocation.
    expect(calls).toEqual(['escape']);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const newLayer = makeLayer(host);
    const calls2: string[] = [];
    newLayer.activate({ onEscapeKeyDown: () => calls2.push('escape2') });

    pressKey(document, 'Escape');
    // Exactly one set of listeners after the rebootstrap.
    expect(calls2).toEqual(['escape2']);
    newLayer.deactivate();
    layer = null;
  });
});
