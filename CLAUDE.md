# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

`forty-cdk` is an Angular library (ng-packagr) that ships **headless / styleless** UI primitives with WAI-ARIA accessibility built in. Inspired by Radix UI and Base UI but reinterpreted **idiomatically for modern Angular** — not a port. The library exposes state, behavior, focus management, and keyboard interaction; the consumer applies their own styles.

Currently, the only code is a placeholder (`projects/forty-cdk/src/lib/forty-cdk.ts`). New primitives are added under `projects/forty-cdk/src/lib/<primitive>/` following the rules below.

## Commands

All commands run from repo root unless noted. The Angular workspace defines a single library project (`forty-cdk`).

```bash
npm run build              # ng build (production, ng-packagr → dist/forty-cdk)
npm run watch              # ng build --watch --configuration development
npm test                   # ng test → @angular/build:unit-test (Vitest + jsdom)
npx ng test --watch        # watch mode for tests
```

Single-file / single-test runs go through Vitest's CLI filtering (the `@angular/build:unit-test` builder forwards args):

```bash
npx ng test -- projects/forty-cdk/src/lib/accordion/accordion.spec.ts
npx ng test -- -t "opens on Enter"
```

There is **no `lint` script** wired up. Prettier is configured (`.prettierrc`, `printWidth: 100`, single quotes); run it with `npx prettier --write <path>` when needed.

To consume the built library locally, use the path alias `forty-cdk` → `./dist/forty-cdk` defined in the root `tsconfig.json`.

## Architecture

**Workspace layout.** Single Angular CLI workspace, `projectType: library`. The library lives at `projects/forty-cdk/`:

- `src/public-api.ts` — single public entry point consumed by ng-packagr (`ng-package.json`).
- `src/lib/` — primitives, one folder per primitive.
- `package.json` (inside the library) declares `"sideEffects": false` for tree-shaking and pins `@angular/{common,core}` as peers — keep both invariants.

**Primitives are composable.** A primitive is not a single component; it's a set of standalone directives/components that the consumer composes in their template. Pieces coordinate via `InjectionToken` + `inject()` (NOT via `@ContentChild`). Typical layout:

```
accordion/
  accordion.ts              # ForAccordion (root)
  accordion-item.ts         # ForAccordionItem
  accordion-trigger.ts      # ForAccordionTrigger
  accordion-content.ts      # ForAccordionContent
  accordion-context.ts      # FOR_ACCORDION_CONTEXT InjectionToken
  accordion.spec.ts
  README.md                 # styleless usage example
  index.ts                  # public exports for `forty-cdk/accordion`
```

**Cross-primitive utilities** (focus trap, live announcer, id generator, roving tabindex, keyboard helpers) live in `projects/forty-cdk/src/lib/_internal/`. Each is named for what it does, not its category — `FocusTrap`, `LiveAnnouncer`, `IdGenerator` — never `*Service`.

**Test utilities** (render helpers, keyboard/focus helpers) live in `projects/forty-cdk/src/test-utils/` and must NOT be re-exported from `public-api.ts`.

**Tree-shakability is a first-class constraint.** Avoid cross-primitive imports. The library ships a single entry point (`forty-cdk`) and relies on `"sideEffects": false` + standalone directives so tree-shakers drop unused primitives. Importing only `ForDisclosure` must not pull in `ForAccordion`. Per-primitive secondary entry points (`forty-cdk/disclosure`, etc.) are deliberately deferred until there's real evidence consumers' bundles need them — the cost in ng-packagr complexity (esp. cross-entry imports for `_internal/`) is not worth it on day one.

## Non-negotiable rules

These rules govern every change. They override habits from older Angular code or React ports.

**Banned dependencies / APIs.** No `@angular/material`, `@angular/cdk`, `@angular/aria`. No `NgModule`. No Zone.js — the library must work under `provideZonelessChangeDetection()`; never use `NgZone` or `zone.js/testing`. No third-party runtime deps unless explicitly justified (e.g. `@floating-ui/dom` for positioning, only if agreed).

**Modern Angular style guide (Angular 20+).** No type suffixes anywhere:
- Files: `accordion.ts`, `focus-trap.ts` — never `accordion.component.ts`, `focus-trap.service.ts`.
- Classes: `ForAccordion`, `FocusTrap` — never `ForAccordionComponent`, `FocusTrapService`. The `Service` suffix is explicitly banned; name services for what they represent.

**Naming.**
- Public classes use the `For` prefix: `ForAccordion`, `ForAccordionTrigger`.
- Selectors use the `for-` prefix and default to **attribute** selectors so consumers keep their own HTML semantics: `<button forAccordionTrigger>`. Use element selectors only when the primitive must inject its own structure with content projection.
- `InjectionToken`s: `FOR_<PRIMITIVE>_CONTEXT` (e.g. `FOR_ACCORDION_CONTEXT`).
- Boolean inputs without `is`/`has` when natural (`disabled`, `open`, `multiple`).
- Outputs as present-tense verbs (`openChange`, `select`, `escapeKeyDown`).

**Required Angular patterns.** Standalone only. `ChangeDetectionStrategy.OnPush` on every component. State with `signal` / `computed` / `linkedSignal` (no `BehaviorSubject` for component state without strong reason). Inputs/outputs as functions: `input()`, `input.required()`, `output()`, `model()` — NEVER `@Input()` / `@Output()` decorators. `inject()` for DI, never constructor injection. Host bindings via the decorator's `host: { ... }` block, never `@HostBinding` / `@HostListener`. Control flow via `@if` / `@for` / `@switch` / `@let`, never `*ngIf` / `*ngFor` / `*ngSwitch`. Prefer `afterNextRender`, `afterEveryRender`, `effect()`, and `DestroyRef` + `takeUntilDestroyed()` over classic lifecycle hooks. `@ContentChild` / `@ViewChild` are only for genuine consumer queries, never for coordinating state between pieces of the same primitive.

**Never propagate state inside `effect()`.** Writing to a signal from inside an `effect` to derive another piece of state is an anti-pattern in modern Angular: it creates implicit cycles, double change-detection passes, and ordering bugs that are hard to debug. `effect()` is for **side effects** that escape the reactive graph (DOM imperative calls, subscriptions to non-signal sources, logging, focus moves that can't be expressed as host bindings). Reach for the right primitive instead:
- **`computed()`** — pure derivation from other signals.
- **`linkedSignal()`** — writable state derived from a source, with a reset rule when the source changes (the canonical replacement for `effect(() => mySignal.set(...))`).
- **`resource()` / `httpResource()`** — async state driven by a signal source (loading, error, value already modeled).
- **`toSignal()` / `toObservable()`** — bridge to/from RxJS without manual `effect`-based wiring.

If you genuinely need to write a signal from an `effect` (rare — usually integrating an external imperative API), document why in a comment and isolate it.

**Form primitives use Signal Forms, never `ControlValueAccessor`.** Any primitive that represents a form value (Switch, Checkbox, RadioGroup, Slider, Combobox, DatePicker, etc.) must implement the appropriate `@angular/forms/signals` interface so it auto-wires with the `[formField]` directive (selector `[formField]`, alias `formField`) — Angular detects the interface and binds everything, no provider/token registration:
- **`FormValueControl<T>`** for value-based controls. Required: `value: ModelSignal<T>`.
- **`FormCheckboxControl`** for binary on/off. Required: `checked: ModelSignal<boolean>`.

Both extend **`FormUiControl`** — expose its relevant optional members (`disabled`, `readonly`, `required`, `invalid`, `errors`, `touched`, `name`, `pending`, `min`/`max`/`pattern` where meaningful) as the prescribed `input` / `model` signals so field state flows in and out without consumer glue. Skip the members that don't apply to the control's shape (e.g. `min`/`max`/`pattern` on a Switch).

The legacy `ControlValueAccessor` / `NG_VALUE_ACCESSOR` pattern is banned. Add `@angular/forms` as an *optional* peer (`peerDependenciesMeta.optional`) so consumers using only non-form primitives don't pull it in.

`@angular/forms/signals` is `@experimental` in Angular 21. Pin to the matching minor (`^21.x`) and revisit on each Angular bump.

**Accessibility is the API.** Every primitive must declare which [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it implements **before any code is written**. Roles, `aria-*` bound to signals, full keyboard interaction, focus management (focus trap, return focus, roving tabindex where applicable), screen-reader announcements via `aria-live`, RTL support, and `prefers-reduced-motion` hooks are all mandatory. Implement focus management in-house — do NOT pull in `@angular/cdk/a11y`.

## Workflow for new primitives

When asked to add a primitive, follow this order:

1. Cite the exact WAI-ARIA APG URL and summarize roles, states, properties, and keyboard interaction.
2. Design the composition: which pieces, which selectors, which inputs/outputs/models per piece, what context is shared via `InjectionToken`.
3. Confirm the API with the user before implementing if non-trivial design decisions exist.
4. Implement piece by piece, one file each (no type suffixes), respecting every rule above.
5. Tests in parallel — behavior, a11y (roles + aria + keyboard + focus), and explicit zoneless coverage (TestBed configured with `provideZonelessChangeDetection`).
6. A `README.md` inside the primitive folder with a minimal styleless usage example.
7. Verify tree-shaking: the primitive imports cleanly in isolation.

## Testing notes

Vitest runs through the Angular CLI builder `@angular/build:unit-test` (configured in `angular.json`). The spec tsconfig (`projects/forty-cdk/tsconfig.spec.json`) sets `types: ["vitest/globals"]`, so `describe` / `it` / `expect` are global — no imports needed. `jsdom` is the DOM environment. Tests use modern standalone `TestBed` setup; a single placeholder spec exists at `projects/forty-cdk/src/lib/forty-cdk.spec.ts` as reference.

Every primitive's test suite must include a case running under `provideZonelessChangeDetection()` to guarantee reactivity works without Zone.js.

## TypeScript expectations

Root `tsconfig.json` already enforces `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictTemplates` / `strictInjectionParameters` / `strictInputAccessModifiers`. No `any` — use `unknown` and narrow. JSDoc on every public input/output/method/signal because it surfaces in consumer IntelliSense and generated docs. Throw `Error` with messages prefixed `[forty-cdk/<primitive>]`.
