import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { pressKey } from '../../../src/test-utils';
import { DismissibleLayer, DismissibleLayerStack } from './dismissible-layer';

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

function makeLayer(host: HTMLElement): DismissibleLayer {
  return new DismissibleLayer(host, TestBed.inject(DismissibleLayerStack));
}

describe('DismissibleLayer', () => {
  let host: HTMLElement;
  let outside: HTMLElement;
  let layer: DismissibleLayer | null = null;

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
    it('invokes onEscapeKeyDown when Escape is pressed', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['escape']);
    });

    it('ignores other keys', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });

      pressKey(document, 'Enter');

      expect(calls).toEqual([]);
    });

    it('does not dispatch Escape when an inner widget already called preventDefault (cooperative opt-out)', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });

      // An inner widget claims Escape by preventing default before the keydown
      // bubbles up to the stack's document listener.
      const inside = host.querySelector('#inside')!;
      const claim = (event: Event): void => event.preventDefault();
      inside.addEventListener('keydown', claim);
      try {
        inside.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
      } finally {
        inside.removeEventListener('keydown', claim);
      }

      expect(calls).toEqual([]);
    });

    it('dispatches Escape normally when no inner widget claims it (positive control)', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });

      const inside = host.querySelector('#inside')!;
      inside.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );

      expect(calls).toEqual(['escape']);
    });
  });

  describe('pointer-down outside', () => {
    it('invokes onPointerDownOutside then onInteractOutside for pointers outside the host', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('pointer'),
        onInteractOutside: () => calls.push('interact'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['pointer', 'interact']);
    });

    it('does not fire when the pointer goes down inside the host', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('pointer'),
      });

      document.dispatchEvent(pointerDown(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });

    it('treats descendants of exemptElements as inside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['pointer'],
        exemptElements: () => [outside],
        onPointerDownOutside: () => calls.push('pointer'),
      });

      document.dispatchEvent(pointerDown(outside.querySelector('#out')!));

      expect(calls).toEqual([]);
    });

    it('uses composedPath()[0] over a retargeted target so a shadow-DOM pointer inside the host counts as inside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('pointer'),
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
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('pointer'),
      });

      document.dispatchEvent(pointerDownComposed(outside, []));

      expect(calls).toEqual(['pointer']);
    });
  });

  describe('focus outside', () => {
    it('invokes onFocusOutside then onInteractOutside when focus moves outside', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('focus'),
        onInteractOutside: () => calls.push('interact'),
      });

      document.dispatchEvent(focusIn(outside));

      expect(calls).toEqual(['focus', 'interact']);
    });

    it('does not fire when focus moves to a descendant of the host', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('focus'),
      });

      document.dispatchEvent(focusIn(host.querySelector('#inside')!));

      expect(calls).toEqual([]);
    });

    it('still dismisses when a nested element stops focusin propagation on the bubble phase', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('focus'),
      });

      const target = outside.querySelector('#out')!;
      const stop = (event: Event): void => event.stopPropagation();
      outside.addEventListener('focusin', stop);
      try {
        target.dispatchEvent(new FocusEvent('focusin', { bubbles: true, cancelable: true }));
      } finally {
        outside.removeEventListener('focusin', stop);
      }

      expect(calls).toEqual(['focus']);
    });
  });

  describe('layer stacking', () => {
    it('only invokes events on the topmost active layer', () => {
      const inner = document.createElement('div');
      document.body.appendChild(inner);

      const calls: string[] = [];
      const outerLayer = makeLayer(host);
      outerLayer.activate({
        channels: ['pointer'],
        onEscapeKeyDown: () => calls.push('outer-escape'),
        onPointerDownOutside: () => calls.push('outer-pointer'),
      });
      const innerLayer = makeLayer(inner);
      innerLayer.activate({
        channels: ['pointer'],
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
      outerLayer.activate({ channels: [], onEscapeKeyDown: () => calls.push('outer') });
      const innerLayer = makeLayer(inner);
      innerLayer.activate({ channels: [], onEscapeKeyDown: () => calls.push('inner') });

      innerLayer.deactivate();
      pressKey(document, 'Escape');

      expect(calls).toEqual(['outer']);

      outerLayer.deactivate();
      inner.remove();
    });
  });

  describe('declared nesting ordering (#1450)', () => {
    let inner: HTMLElement;
    let sibling: HTMLElement;

    beforeEach(() => {
      inner = document.createElement('div');
      inner.innerHTML = `<button id="deep">deep</button>`;
      document.body.appendChild(inner);
      sibling = document.createElement('div');
      document.body.appendChild(sibling);
    });

    afterEach(() => {
      inner.remove();
      sibling.remove();
    });

    it('places a deeper level above its ancestor even when the ancestor activates last', () => {
      const chain = {};
      const calls: string[] = [];
      const child = makeLayer(inner);
      child.activate({
        channels: ['focus'],
        nesting: { chain, depth: 1 },
        onEscapeKeyDown: () => calls.push('child-escape'),
        onFocusOutside: () => calls.push('child-focus'),
      });
      const parent = makeLayer(host);
      parent.activate({
        channels: ['focus'],
        nesting: { chain, depth: 0 },
        onEscapeKeyDown: () => calls.push('parent-escape'),
        onFocusOutside: () => calls.push('parent-focus'),
      });

      pressKey(document, 'Escape');
      document.dispatchEvent(focusIn(inner.querySelector('#deep')!));

      expect(calls).toEqual(['child-escape']);

      parent.deactivate();
      child.deactivate();
    });

    it('keeps activation order for levels of the same chain that arrive parent-first', () => {
      const chain = {};
      const calls: string[] = [];
      const parent = makeLayer(host);
      parent.activate({
        channels: [],
        nesting: { chain, depth: 0 },
        onEscapeKeyDown: () => calls.push('parent'),
      });
      const child = makeLayer(inner);
      child.activate({
        channels: [],
        nesting: { chain, depth: 1 },
        onEscapeKeyDown: () => calls.push('child'),
      });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['child']);

      child.deactivate();
      parent.deactivate();
    });

    it('never reorders a layer past a chain it does not belong to', () => {
      const chain = {};
      const calls: string[] = [];
      const deep = makeLayer(inner);
      deep.activate({
        channels: [],
        nesting: { chain, depth: 1 },
        onEscapeKeyDown: () => calls.push('deep'),
      });
      const unrelated = makeLayer(sibling);
      unrelated.activate({ channels: [], onEscapeKeyDown: () => calls.push('unrelated') });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['unrelated']);

      unrelated.deactivate();
      deep.deactivate();
    });

    it('never reorders a layer past a deeper level of a different chain', () => {
      const calls: string[] = [];
      const deep = makeLayer(inner);
      deep.activate({
        channels: [],
        nesting: { chain: {}, depth: 2 },
        onEscapeKeyDown: () => calls.push('deep-other-chain'),
      });
      const root = makeLayer(host);
      root.activate({
        channels: [],
        nesting: { chain: {}, depth: 0 },
        onEscapeKeyDown: () => calls.push('root'),
      });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['root']);

      root.deactivate();
      deep.deactivate();
    });

    it('orders three levels of one chain by depth regardless of activation order', () => {
      const chain = {};
      const calls: string[] = [];
      const middle = makeLayer(inner);
      middle.activate({
        channels: [],
        nesting: { chain, depth: 1 },
        onEscapeKeyDown: () => calls.push('middle'),
      });
      const deepest = makeLayer(sibling);
      deepest.activate({
        channels: [],
        nesting: { chain, depth: 2 },
        onEscapeKeyDown: () => calls.push('deepest'),
      });
      const root = makeLayer(host);
      root.activate({
        channels: [],
        nesting: { chain, depth: 0 },
        onEscapeKeyDown: () => calls.push('root'),
      });

      pressKey(document, 'Escape');
      expect(calls).toEqual(['deepest']);

      deepest.deactivate();
      pressKey(document, 'Escape');
      expect(calls).toEqual(['deepest', 'middle']);

      middle.deactivate();
      pressKey(document, 'Escape');
      expect(calls).toEqual(['deepest', 'middle', 'root']);

      root.deactivate();
    });
  });

  describe('channel ownership is declared, not inferred from handler presence', () => {
    let inner: HTMLElement;

    beforeEach(() => {
      inner = document.createElement('div');
      document.body.appendChild(inner);
    });

    afterEach(() => {
      inner.remove();
    });

    it('a top layer with an onPointerDownOutside handler but no declared pointer channel is transparent to pointer routing', () => {
      const calls: string[] = [];
      const declaresPointer = makeLayer(host);
      declaresPointer.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('declared'),
      });
      // Handler wired, but `'pointer'` NOT declared → the stack must skip it and
      // route to the layer below that actually declared the channel. Under the
      // old handler-presence inference this layer would have shadowed the one
      // below.
      const undeclared = makeLayer(inner);
      undeclared.activate({
        channels: [],
        onPointerDownOutside: () => calls.push('undeclared'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['declared']);

      undeclared.deactivate();
      declaresPointer.deactivate();
    });

    it('a top layer with an onFocusOutside handler but no declared focus channel is transparent to focus routing', () => {
      const calls: string[] = [];
      const declaresFocus = makeLayer(host);
      declaresFocus.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('declared'),
      });
      const undeclared = makeLayer(inner);
      undeclared.activate({
        channels: [],
        onFocusOutside: () => calls.push('undeclared'),
      });

      document.dispatchEvent(focusIn(outside));

      expect(calls).toEqual(['declared']);

      undeclared.deactivate();
      declaresFocus.deactivate();
    });
  });

  describe('per-channel dispatch — Escape-only layer transparency (#1309)', () => {
    let inner: HTMLElement;

    beforeEach(() => {
      inner = document.createElement('div');
      document.body.appendChild(inner);
    });

    afterEach(() => {
      inner.remove();
    });

    it('an Escape-only top layer does not swallow pointer-down-outside for the layer below', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('below-pointer'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const escapeOnly = makeLayer(inner);
      escapeOnly.activate({
        channels: [],
        onEscapeKeyDown: () => calls.push('escape-only-escape'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['below-pointer', 'below-interact']);

      escapeOnly.deactivate();
      below.deactivate();
    });

    it('an Escape-only top layer does not swallow focus-outside for the layer below', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('below-focus'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const escapeOnly = makeLayer(inner);
      escapeOnly.activate({
        channels: [],
        onEscapeKeyDown: () => calls.push('escape-only-escape'),
      });

      document.dispatchEvent(focusIn(outside));

      expect(calls).toEqual(['below-focus', 'below-interact']);

      escapeOnly.deactivate();
      below.deactivate();
    });

    it('the Escape-only top layer still owns Escape while the layer below is never consulted', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['pointer'],
        onEscapeKeyDown: () => calls.push('below-escape'),
        onPointerDownOutside: () => calls.push('below-pointer'),
      });
      const escapeOnly = makeLayer(inner);
      escapeOnly.activate({
        channels: [],
        onEscapeKeyDown: () => calls.push('escape-only-escape'),
      });

      pressKey(document, 'Escape');

      expect(calls).toEqual(['escape-only-escape']);

      escapeOnly.deactivate();
      below.deactivate();
    });

    it('nested real layers keep single pointer-dismiss semantics (only the topmost handler responds)', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('below-pointer'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const above = makeLayer(inner);
      above.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('above-pointer'),
        onInteractOutside: () => calls.push('above-interact'),
      });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['above-pointer', 'above-interact']);

      above.deactivate();
      below.deactivate();
    });
  });

  describe('stack-aware containment (#1379)', () => {
    let aboveHost: HTMLElement;

    beforeEach(() => {
      // A separately-portaled, interactive Escape-only surface (a HoverCard),
      // stacked above a real dismissible layer (a Popover / Menu). Its host is
      // NOT a DOM descendant of the layer below, so DOM containment alone would
      // treat an interaction inside it as "outside".
      aboveHost = document.createElement('div');
      aboveHost.id = 'above';
      aboveHost.innerHTML = `<button id="above-btn">hover-card action</button>`;
      document.body.appendChild(aboveHost);
    });

    afterEach(() => {
      aboveHost.remove();
    });

    it('a pointer-down inside an Escape-only layer stacked above does not dismiss the layer below', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('below-pointer'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const above = makeLayer(aboveHost);
      above.activate({ channels: [], onEscapeKeyDown: () => calls.push('above-escape') });

      document.dispatchEvent(pointerDown(aboveHost.querySelector('#above-btn')!));

      expect(calls).toEqual([]);

      above.deactivate();
      below.deactivate();
    });

    it('a focus-in inside an Escape-only layer stacked above does not dismiss the layer below', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['focus'],
        onFocusOutside: () => calls.push('below-focus'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const above = makeLayer(aboveHost);
      above.activate({ channels: [], onEscapeKeyDown: () => calls.push('above-escape') });

      document.dispatchEvent(focusIn(aboveHost.querySelector('#above-btn')!));

      expect(calls).toEqual([]);

      above.deactivate();
      below.deactivate();
    });

    it('a pointer-down genuinely outside every stacked layer still dismisses the layer below', () => {
      const calls: string[] = [];
      const below = makeLayer(host);
      below.activate({
        channels: ['pointer'],
        onPointerDownOutside: () => calls.push('below-pointer'),
        onInteractOutside: () => calls.push('below-interact'),
      });
      const above = makeLayer(aboveHost);
      above.activate({ channels: [], onEscapeKeyDown: () => calls.push('above-escape') });

      document.dispatchEvent(pointerDown(outside));

      expect(calls).toEqual(['below-pointer', 'below-interact']);

      above.deactivate();
      below.deactivate();
    });
  });

  describe('document listener refcounting (#1379)', () => {
    const isLayerEvent = (name: unknown): boolean =>
      name === 'keydown' || name === 'pointerdown' || name === 'focusin';

    it('installs listeners on the first activation and removes them after the last deactivation', () => {
      const added = vi.spyOn(document, 'addEventListener');
      const removed = vi.spyOn(document, 'removeEventListener');
      const layerAdds = (): number => added.mock.calls.filter((c) => isLayerEvent(c[0])).length;
      const layerRemoves = (): number =>
        removed.mock.calls.filter((c) => isLayerEvent(c[0])).length;

      // Constructing the stack (first inject) must not attach any listener.
      const first = makeLayer(host);
      expect(layerAdds()).toBe(0);

      // 0 → 1: install all three.
      first.activate({ channels: [], onEscapeKeyDown: () => {} });
      expect(layerAdds()).toBe(3);

      // 1 → 2: no additional install.
      const inner = document.createElement('div');
      document.body.appendChild(inner);
      const second = makeLayer(inner);
      second.activate({ channels: [], onEscapeKeyDown: () => {} });
      expect(layerAdds()).toBe(3);

      // 2 → 1: no removal yet.
      second.deactivate();
      expect(layerRemoves()).toBe(0);

      // 1 → 0: remove all three.
      first.deactivate();
      expect(layerRemoves()).toBe(3);

      inner.remove();
    });

    it('re-installs listeners on a fresh 0 → 1 activation after the stack has emptied', () => {
      const calls: string[] = [];
      layer = makeLayer(host);
      layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('first') });
      layer.deactivate();

      const again = makeLayer(host);
      again.activate({ channels: [], onEscapeKeyDown: () => calls.push('second') });
      pressKey(document, 'Escape');
      expect(calls).toEqual(['second']);

      again.deactivate();
      layer = null;
    });
  });

  it('is idempotent: activate twice has no extra effect', () => {
    const calls: string[] = [];
    layer = makeLayer(host);
    layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('once') });
    layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('twice') });

    pressKey(document, 'Escape');

    expect(calls).toEqual(['once']);
    expect(layer.isActive).toBe(true);
  });

  it('detaches from dispatch on deactivate', () => {
    const calls: string[] = [];
    layer = makeLayer(host);
    layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });
    layer.deactivate();

    pressKey(document, 'Escape');

    expect(calls).toEqual([]);
    expect(layer.isActive).toBe(false);
  });

  it('document listeners are removed when the application injector is destroyed', () => {
    layer = makeLayer(host);
    const calls: string[] = [];
    layer.activate({ channels: [], onEscapeKeyDown: () => calls.push('escape') });
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
    newLayer.activate({ channels: [], onEscapeKeyDown: () => calls2.push('escape2') });

    pressKey(document, 'Escape');
    // Exactly one set of listeners after the rebootstrap.
    expect(calls2).toEqual(['escape2']);
    newLayer.deactivate();
    layer = null;
  });
});
