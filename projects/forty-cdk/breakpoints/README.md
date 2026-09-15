---
title: Breakpoints
group: utilities
archetype: [headless-utility]
---

# Breakpoints

A signal-first, zoneless, SSR-safe viewport breakpoint observer (injectBreakpoints). Configure the breakpoint map once via provideForBreakpointsDefaults — or use the Tailwind scale by default — then read up / down / between / only / active or any arbitrary media query, each as a live Signal&lt;boolean&gt;.

It is a headless reactive utility, not a UI primitive: no DOM, no ARIA, no template. Configure the breakpoint map **once** via a provider; read it anywhere with `injectBreakpoints()` — no need to repeat the breakpoint set at every call site.

## Setup

Configuring is optional — without a provider the Tailwind scale (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536) is used. To define your own:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideForBreakpointsDefaults } from 'forty-cdk/breakpoints';

export const appConfig: ApplicationConfig = {
  providers: [
    provideForBreakpointsDefaults({ mobile: 0, tablet: 640, laptop: 1024, desktop: 1280 }),
  ],
};
```

Providing it again on a component injector replaces the map for that subtree only (nearest scope wins; the map is replaced wholesale, never merged key-by-key).

## Examples

Resize the preview and watch the matched breakpoint change: `injectBreakpoints()` hands back signals, so the template re-renders without a listener of your own.

```ts
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { forBreakpointsTailwind, injectBreakpoints } from 'forty-cdk/breakpoints';

type TailwindName = keyof typeof forBreakpointsTailwind;

@Component({
  selector: 'app-breakpoints-active-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bp-demo">
      <div class="bp-readout">
        <span class="bp-readout-label">active breakpoint</span>
        <span class="bp-active">{{ active() ?? 'below sm' }}</span>
        <span class="bp-width">viewport ≈ {{ width() }}px</span>
      </div>

      <ul class="bp-grid">
        @for (row of rows; track row.name) {
          <li class="bp-cell" [class.bp-cell--on]="row.up()">
            <span class="bp-name">{{ row.name }}</span>
            <span class="bp-min">≥ {{ row.min }}px</span>
            <span class="bp-flags">
              <span class="bp-flag" [class.bp-flag--on]="row.up()">up</span>
              <span class="bp-flag" [class.bp-flag--on]="row.only()">only</span>
            </span>
          </li>
        }
      </ul>
    </div>
  `,
})
export class BreakpointsActiveExample {
  protected readonly bp = injectBreakpoints();
  protected readonly active = this.bp.active;

  protected readonly rows = (Object.keys(forBreakpointsTailwind) as TailwindName[]).map((name) => ({
    name,
    min: forBreakpointsTailwind[name],
    up: this.bp.up(name),
    only: this.bp.only(name),
  }));

  protected readonly width = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onResize = (): void => this.width.set(globalThis.innerWidth);
      onResize();
      globalThis.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => globalThis.removeEventListener('resize', onResize));
    });
  }
}
```

The returned handle captures its injection context, so the query methods can be called lazily from a `computed()` or a template, not only during construction:

<!-- snippet: fragment -->

```ts
protected columns = computed(() => (this.bp.up('xl')() ? 4 : this.bp.up('md')() ? 2 : 1));
```

### Responsive layout

Derive UI from the breakpoint inside `computed()` and `@if` instead of repeating media queries in the template. The card grid picks its column count from `up('md')` / `up('lg')` / `up('xl')`, and the sidebar is only mounted at `lg` and wider.

### Arbitrary media queries

`matches(query)` is the escape hatch for any media feature the named width helpers don't cover — orientation, pointer, hover, and the `prefers-*` user settings. Each call returns a live `Signal<boolean>` from the same cached `MediaQueryList` layer.

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

## API

### `injectBreakpoints`

| Method           | Matches                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `up(name)`       | the breakpoint and wider — `(min-width: N px)`                                 |
| `down(name)`     | narrower than the breakpoint — `(max-width: (N − 0.02) px)`                    |
| `between(a, b)`  | from `a` (inclusive) up to but not including `b`                               |
| `only(name)`     | the breakpoint's own band, up to but not including the next-larger one         |
| `active`         | the largest breakpoint whose `min-width` matches, or `null` below the smallest |
| `matches(query)` | escape hatch for an arbitrary media query (orientation, `prefers-*`, …)        |

### `injectPrefersReducedMotion`

The same shape for a different query: `injectPrefersReducedMotion()` returns a `Signal<boolean>` that is `true` while the user has asked their OS to suppress animation, and flips if they change the setting mid-session. Call it from an injection context, like `injectBreakpoints()`.

```ts
import { computed } from '@angular/core';
import { injectPrefersReducedMotion } from 'forty-cdk/breakpoints';

export class Panel {
  private readonly reducedMotion = injectPrefersReducedMotion();

  protected readonly transition = computed(() =>
    this.reducedMotion() ? 'none' : 'transform 200ms ease-out',
  );
}
```

It is published here because forty-cdk ships no styles: the animation on a `data-state` change is yours, so honouring the preference is yours too — and a signal is what a `computed()` or a `[style]` binding can branch on, which a CSS `@media` block cannot. Treat `true` as "skip the animated path entirely", not "shorten the duration": the setting asks for no motion, not less of it.

`bp.matches('(prefers-reduced-motion: reduce)')` resolves to the same thing. Prefer the named helper — it is the one the library's own motion-bearing primitives (drag gestures, carousel, drawer) read, so the query string stays spelled in one place.

## SSR

On the server (or where `matchMedia` is unavailable) every query signal reads `false` and `active` reads `null`. No `matchMedia` access happens server-side, so the helper is safe under Angular Universal. `injectPrefersReducedMotion()` reads `false` there for the same reason: the server render takes the animated branch, and the client applies the real preference on its first observation.
