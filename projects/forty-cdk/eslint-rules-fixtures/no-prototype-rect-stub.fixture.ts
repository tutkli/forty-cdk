/**
 * Fixture for `forty-cdk/no-prototype-rect-stub`.
 *
 * Patching `*.prototype.getBoundingClientRect` (or `offsetWidth`, etc.) in a
 * spec is forbidden — jsdom returns zero for layout APIs and a single
 * prototype patch is silently shadowed depending on the host OS (see #193).
 * Geometry assertions belong in Playwright. Every spelling of the patch is
 * reported: an assignment, `Object.defineProperty`, `Object.defineProperties`,
 * `Reflect.defineProperty` and Vitest's `vi.spyOn`. See
 * .claude/rules/testing.md § "Test isolation — non-negotiables" rule 8.
 */

declare const vi: {
  spyOn(target: object, key: string, accessType?: 'get' | 'set'): unknown;
};
declare const host: HTMLElement;

// Expected: 1× forty-cdk/no-prototype-rect-stub (direct assignment)
Element.prototype.getBoundingClientRect = () =>
  ({
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    top: 0,
    left: 0,
    right: 100,
    bottom: 50,
    toJSON: () => ({}),
  }) as DOMRect;

// Expected: 1× forty-cdk/no-prototype-rect-stub (Object.defineProperty form)
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get: () => 100,
});

// Expected: 1× forty-cdk/no-prototype-rect-stub (vi.spyOn getter form)
vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get');

// Expected: 1× forty-cdk/no-prototype-rect-stub (vi.spyOn method form)
vi.spyOn(Element.prototype, 'getBoundingClientRect');

// Expected: 1× forty-cdk/no-prototype-rect-stub (Object.defineProperties form)
Object.defineProperties(HTMLElement.prototype, {
  clientHeight: { configurable: true, get: () => 50 },
  tabIndex: { configurable: true, value: 0 },
});

// Expected: 1× forty-cdk/no-prototype-rect-stub (Reflect.defineProperty form)
Reflect.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 10 });

// Allowed: a stub on one element exercises wiring without patching every element.
vi.spyOn(host, 'getBoundingClientRect');
Object.defineProperty(host, 'offsetHeight', { configurable: true, get: () => 10 });

// Allowed: a prototype member that is not a layout API.
vi.spyOn(HTMLElement.prototype, 'focus');
