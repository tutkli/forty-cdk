# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Inspired by Radix UI and Base UI but reinterpreted idiomatically for modern Angular.

## Installation

```bash
npm install forty-cdk
```

### Peer dependencies

Required:

- `@angular/common` `^21.2.0`
- `@angular/core` `^21.2.0`

Optional — install only if you use the matching primitives:

| Peer | Needed by |
| --- | --- |
| `@angular/forms` `^21.2.0` | Form-control primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox`, plus future `Select` / `Slider` / `Combobox`). They implement `FormValueControl` / `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring. Consumers using only non-form primitives can skip it. |
| `@floating-ui/dom` `^1.6.0` | Positioned overlays (`Tooltip` today; future `Popover` / `Menu` / `Select`). Consumers using only `Disclosure`, `Accordion`, `Tabs`, `Switch`, `Checkbox`, `RadioGroup`, `Listbox`, or `Dialog` can skip it. |

`@angular/forms/signals` is `@experimental` in Angular 21, so we pin to the matching minor (`^21.2.0`) and revisit on each Angular bump.

## Primitives

Each primitive lives under [`src/lib/<primitive>/`](src/lib) with its own `README.md` and a minimal styleless usage example.

The library ships a single entry point (`forty-cdk`); standalone directives plus `"sideEffects": false` let tree-shakers drop primitives you don't import.

## Building

```bash
ng build forty-cdk
```

Build artifacts land in `dist/forty-cdk` (consumed locally via the `forty-cdk` path alias in the root `tsconfig.json`).

## Testing

Tests run on Vitest via the Angular CLI builder `@angular/build:unit-test`:

```bash
npm test                                       # all specs, single pass
npx ng test --watch                            # watch mode
npx ng test -- src/lib/accordion/accordion.spec.ts  # single file
npx ng test -- -t "opens on Enter"             # single test by name
```

Every primitive's test suite includes a case running under `provideZonelessChangeDetection()` to keep reactivity working without Zone.js.
