/**
 * Fixture for `forty-cdk/no-prototype-rect-stub`.
 *
 * Patching `*.prototype.getBoundingClientRect` (or `offsetWidth`, etc.) in a
 * spec is forbidden — jsdom returns zero for layout APIs and a single
 * prototype patch is silently shadowed depending on the host OS (see #193).
 * Geometry assertions belong in Playwright. See CLAUDE.md > Testing notes >
 * Test isolation — non-negotiables > rule 8.
 */

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
