import {
  composedClosest,
  composedContains,
  composedParentElement,
  composedPrecedes,
  resolveActiveElement,
  resolveEventTarget,
} from './composed-tree';

interface ShadowFixture {
  readonly container: HTMLElement;
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  readonly inner: HTMLButtonElement;
}

function mountShadowFixture(): ShadowFixture {
  const container = document.createElement('div');
  const host = document.createElement('shadow-widget');
  container.appendChild(host);
  document.body.appendChild(container);

  const shadow = host.attachShadow({ mode: 'open' });
  const inner = document.createElement('button');
  inner.id = 'inner';
  shadow.appendChild(inner);

  return { container, host, shadow, inner };
}

describe('composed-tree', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('resolveActiveElement', () => {
    it('descends into an open shadow root instead of reporting the host', () => {
      const { host, inner } = mountShadowFixture();
      inner.focus();

      expect(document.activeElement).toBe(host);
      expect(resolveActiveElement(document)).toBe(inner);
    });

    it('descends through nested open shadow roots', () => {
      const { shadow } = mountShadowFixture();
      const nestedHost = document.createElement('nested-widget');
      shadow.appendChild(nestedHost);
      const deepest = document.createElement('button');
      nestedHost.attachShadow({ mode: 'open' }).appendChild(deepest);

      deepest.focus();

      expect(resolveActiveElement(document)).toBe(deepest);
    });

    it('returns the light-DOM active element unchanged', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      expect(resolveActiveElement(document)).toBe(button);
    });
  });

  describe('resolveEventTarget', () => {
    it('resolves the originating node inside a shadow tree, not the retargeted host', () => {
      const { inner } = mountShadowFixture();
      let target: Node | null = null;
      const listener = (event: Event): void => {
        target = resolveEventTarget(event);
      };
      document.addEventListener('pointerdown', listener, true);
      try {
        inner.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }));
      } finally {
        document.removeEventListener('pointerdown', listener, true);
      }

      expect(target).toBe(inner);
    });

    it('falls back to event.target when composedPath is unavailable', () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      const event = new Event('pointerdown', { bubbles: true });
      Object.defineProperty(event, 'composedPath', { value: undefined });
      Object.defineProperty(event, 'target', { value: button });

      expect(resolveEventTarget(event)).toBe(button);
    });
  });

  describe('composedContains', () => {
    it('reports a node inside a nested shadow root as contained', () => {
      const { container, inner } = mountShadowFixture();

      expect(container.contains(inner)).toBe(false);
      expect(composedContains(container, inner)).toBe(true);
    });

    it('reports a node in a sibling shadow tree as not contained', () => {
      const { container } = mountShadowFixture();
      const otherHost = document.createElement('other-widget');
      document.body.appendChild(otherHost);
      const otherInner = document.createElement('button');
      otherHost.attachShadow({ mode: 'open' }).appendChild(otherInner);

      expect(composedContains(container, otherInner)).toBe(false);
    });

    it('reports the container itself as contained and null as not', () => {
      const { container } = mountShadowFixture();

      expect(composedContains(container, container)).toBe(true);
      expect(composedContains(container, null)).toBe(false);
    });
  });

  describe('composedParentElement', () => {
    it('crosses a shadow boundary to the host', () => {
      const { host, inner } = mountShadowFixture();

      expect(inner.parentElement).toBeNull();
      expect(composedParentElement(inner)).toBe(host);
    });

    it('returns the plain parent element inside one tree', () => {
      const { container, host } = mountShadowFixture();

      expect(composedParentElement(host)).toBe(container);
    });

    it('does not mistake an anchor ancestor for a shadow root', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com/path';
      const child = document.createElement('button');
      anchor.appendChild(child);
      document.body.appendChild(anchor);

      expect(composedParentElement(child)).toBe(anchor);
    });
  });

  describe('composedClosest', () => {
    it('finds an ancestor above the shadow boundary', () => {
      const { container, inner } = mountShadowFixture();
      container.setAttribute('data-overlay-id', 'a');

      expect(inner.closest('[data-overlay-id]')).toBeNull();
      expect(composedClosest(inner, '[data-overlay-id]')).toBe(container);
    });

    it('prefers the nearest match inside the shadow tree', () => {
      const { container, shadow, inner } = mountShadowFixture();
      container.setAttribute('data-overlay-id', 'outer');
      const nearer = document.createElement('div');
      nearer.setAttribute('data-overlay-id', 'inner');
      shadow.appendChild(nearer);
      nearer.appendChild(inner);

      expect(composedClosest(inner, '[data-overlay-id]')).toBe(nearer);
    });

    it('climbs through nested shadow roots', () => {
      const { container, shadow } = mountShadowFixture();
      container.setAttribute('data-overlay-id', 'a');
      const nestedHost = document.createElement('nested-widget');
      shadow.appendChild(nestedHost);
      const deepest = document.createElement('button');
      nestedHost.attachShadow({ mode: 'open' }).appendChild(deepest);

      expect(composedClosest(deepest, '[data-overlay-id]')).toBe(container);
    });

    it('returns null when nothing above the node matches', () => {
      const { inner } = mountShadowFixture();

      expect(composedClosest(inner, '[data-overlay-id]')).toBeNull();
    });

    it('matches the node itself', () => {
      const { inner } = mountShadowFixture();
      inner.setAttribute('data-overlay-id', 'self');

      expect(composedClosest(inner, '[data-overlay-id]')).toBe(inner);
    });
  });

  describe('composedPrecedes', () => {
    it('orders two light-DOM siblings by document position', () => {
      const a = document.createElement('button');
      const b = document.createElement('button');
      document.body.append(a, b);

      expect(composedPrecedes(a, b)).toBe(true);
      expect(composedPrecedes(b, a)).toBe(false);
    });

    it('places an ancestor before its descendants', () => {
      const { container, inner } = mountShadowFixture();
      const light = document.createElement('button');
      container.appendChild(light);

      expect(composedPrecedes(container, light)).toBe(true);
      expect(composedPrecedes(light, container)).toBe(false);
      expect(composedPrecedes(container, inner)).toBe(true);
      expect(composedPrecedes(inner, container)).toBe(false);
    });

    it('places a shadow host before the contents of its shadow root', () => {
      const { host, inner } = mountShadowFixture();

      expect(composedPrecedes(host, inner)).toBe(true);
      expect(composedPrecedes(inner, host)).toBe(false);
    });

    it('orders a shadow-nested node against light-DOM nodes on either side of its host', () => {
      const { container, inner } = mountShadowFixture();
      const before = document.createElement('button');
      const after = document.createElement('button');
      container.prepend(before);
      container.append(after);

      expect(composedPrecedes(before, inner)).toBe(true);
      expect(composedPrecedes(inner, before)).toBe(false);
      expect(composedPrecedes(inner, after)).toBe(true);
      expect(composedPrecedes(after, inner)).toBe(false);
    });

    it('places shadow contents before the light children of the same host', () => {
      const { host, inner } = mountShadowFixture();
      const slotted = document.createElement('button');
      host.appendChild(slotted);

      expect(composedPrecedes(inner, slotted)).toBe(true);
      expect(composedPrecedes(slotted, inner)).toBe(false);
    });

    it('orders nodes in two sibling shadow roots through nested hosts', () => {
      const { shadow, inner } = mountShadowFixture();
      const nestedHost = document.createElement('nested-widget');
      shadow.appendChild(nestedHost);
      const deepest = document.createElement('button');
      nestedHost.attachShadow({ mode: 'open' }).appendChild(deepest);

      expect(composedPrecedes(inner, deepest)).toBe(true);
      expect(composedPrecedes(deepest, inner)).toBe(false);
    });

    it('reports false for the same node', () => {
      const { inner } = mountShadowFixture();

      expect(composedPrecedes(inner, inner)).toBe(false);
    });
  });
});
