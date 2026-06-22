# Breakpoints

A signal-first, zoneless, SSR-safe viewport breakpoint observer. Configure the breakpoint map **once** via a provider; read it anywhere with `injectBreakpoints()` — no need to repeat the breakpoint set at every call site.

It is a headless reactive utility, not a UI primitive: no DOM, no ARIA, no template. Each query method returns a `Signal<boolean>`.

## Setup

Configuring is optional — without a provider the Tailwind scale (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536) is used. To define your own:

```ts
import { provideForBreakpoints } from 'forty-cdk';

export const appConfig: ApplicationConfig = {
  providers: [provideForBreakpoints({ mobile: 0, tablet: 640, laptop: 1024, desktop: 1280 })],
};
```

Providing it again on a component injector replaces the map for that subtree only (nearest scope wins; the map is replaced wholesale, never merged key-by-key).

## Usage

```ts
import { Component, inject } from '@angular/core';
import { injectBreakpoints } from 'forty-cdk';

@Component({
  selector: 'app-layout',
  template: `
    @if (isDesktop()) {
      <aside>Sidebar</aside>
    }
    <main>Active breakpoint: {{ active() }}</main>
  `,
})
export class Layout {
  private bp = injectBreakpoints();

  protected isDesktop = this.bp.up('lg'); // (min-width: 1024px) and wider
  protected active = this.bp.active; // 'sm' | 'md' | … | null
}
```

| Method           | Matches                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `up(name)`       | the breakpoint and wider — `(min-width: N px)`                                 |
| `down(name)`     | narrower than the breakpoint — `(max-width: (N − 0.02) px)`                    |
| `between(a, b)`  | from `a` (inclusive) up to but not including `b`                               |
| `only(name)`     | the breakpoint's own band, up to but not including the next-larger one         |
| `active`         | the largest breakpoint whose `min-width` matches, or `null` below the smallest |
| `matches(query)` | escape hatch for an arbitrary media query (orientation, `prefers-*`, …)        |

The returned handle captures its injection context, so the query methods can be called lazily from a `computed()` or a template, not only during construction:

```ts
protected columns = computed(() => (this.bp.up('xl')() ? 4 : this.bp.up('md')() ? 2 : 1));
```

## Typed custom names

The default map gives you fully-typed names out of the box (`up('md')` autocompletes; `up('foo')` is a type error). When you provide a custom map, recover the same typing by augmenting `BreakpointRegistry` once — derive the keys from your map so you never write them twice:

```ts
// breakpoints.ts
export const appBreakpoints = {
  mobile: 0,
  tablet: 640,
  laptop: 1024,
  desktop: 1280,
} as const;

declare module 'forty-cdk' {
  interface BreakpointRegistry extends Record<keyof typeof appBreakpoints, true> {}
}
```

Now `injectBreakpoints()` autocompletes `'mobile' | 'tablet' | 'laptop' | 'desktop'` across the whole app.

## SSR

On the server (or where `matchMedia` is unavailable) every query signal reads `false` and `active` reads `null`. No `matchMedia` access happens server-side, so the helper is safe under Angular Universal.
