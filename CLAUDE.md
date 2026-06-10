# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Before you start, read the path-scoped rules.** Before designing/implementing a primitive, consult `.claude/rules/conventions.md`; before touching tests, `.claude/rules/testing.md`. Both auto-load when you edit the files they're scoped to (library `*.ts`, and spec/harness/test-config files respectively), so their full detail is in context exactly when it's relevant — this file keeps only what applies to every session.

## Project purpose

`forty-cdk` is an Angular library (ng-packagr) that ships **headless / styleless** UI primitives with WAI-ARIA accessibility built in. Inspired by Radix UI and Base UI but reinterpreted **idiomatically for modern Angular** — not a port. The library exposes state, behavior, focus management, and keyboard interaction; the consumer applies their own styles. New primitives are added under `projects/forty-cdk/src/lib/<primitive>/` following the rules below.

## Commands

All commands run from repo root unless noted. The Angular workspace contains the library project (`forty-cdk`) and a small dev-only application (`forty-cdk-harness`) used by the Playwright E2E suite — `pnpm build` and `pnpm test` are pinned to the library project so the harness never ships.

The repo uses **pnpm** (pinned via `packageManager` in `package.json`, activated through Corepack). With Corepack enabled (`corepack enable`), running `pnpm <cmd>` in this directory will use the correct version automatically. Otherwise install pnpm globally with `npm i -g pnpm@10`.

```bash
pnpm build                 # ng build forty-cdk (production, ng-packagr → dist/forty-cdk)
pnpm watch                 # ng build forty-cdk --watch --configuration development
pnpm test                  # ng test forty-cdk → @angular/build:unit-test (Vitest + jsdom)
pnpm exec ng test forty-cdk --watch  # watch mode for tests
pnpm lint                  # eslint . (flat config, codifies CLAUDE.md non-negotiables)
pnpm test:e2e              # playwright test (Chromium + WebKit; spins ng serve forty-cdk-harness)
pnpm test:e2e:ui           # playwright test --ui
pnpm test:e2e:install      # playwright install --with-deps chromium webkit
```

Single-file / single-test runs use the `@angular/build:unit-test` builder's own flags — `--include` (spec path, repeatable for several files) and `--filter` (test/suite-name regex). The `-- <path>` / `-- -t "<name>"` passthrough does **not** work on this setup (pnpm mangles the quoted `--`, so `ng` rejects it):

```bash
pnpm exec ng test forty-cdk --include "projects/forty-cdk/src/lib/accordion/accordion.spec.ts"
pnpm exec ng test forty-cdk --filter "opens on Enter"
```

To consume the built library locally, use the path alias `forty-cdk` → `./dist/forty-cdk` defined in the root `tsconfig.json`.

The Vitest builder / setup-file invariants and the nightly scheduler-hostile shuffle profile are documented in `.claude/rules/testing.md`; the full ESLint enforcement detail (banned imports/syntax/selectors, typescript-eslint hardening, Prettier) is in `.claude/rules/conventions.md`.

## Architecture

- **Workspace layout.** Single Angular CLI workspace, `projectType: library`. The library lives at `projects/forty-cdk/`: `src/public-api.ts` is the main public entry point consumed by ng-packagr (`ng-package.json`); `src/lib/` holds primitives, one folder per primitive; the only secondary entry point lives at `internationalized-date/` (own `ng-package.json`, see Tree-shakability below); the library's own `package.json` declares `"sideEffects": false` for tree-shaking and pins `@angular/{common,core}` as peers — keep both invariants.
- **Primitives are composable.** A primitive is not a single component; it's a set of standalone directives/components the consumer composes in their template, coordinating via `InjectionToken` + `inject()` (NOT `@ContentChild`). Typical layout:

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

- **Cross-primitive utilities** (focus trap, live announcer, id generator, roving tabindex, keyboard helpers) live in `projects/forty-cdk/src/lib/_internal/`. Each is named for what it does, not its category — `FocusTrap`, `LiveAnnouncer`, `IdGenerator` — never `*Service`.
- **Test utilities** (render helpers, keyboard/focus helpers) live in `projects/forty-cdk/src/test-utils/` and must NOT be re-exported from `public-api.ts`.
- **Tree-shakability is a first-class constraint.** Avoid cross-primitive imports. The main entry point (`forty-cdk`) + `"sideEffects": false` + standalone directives let tree-shakers drop unused primitives — importing only `ForDisclosure` must not pull in `ForAccordion`. Per-primitive secondary entry points (`forty-cdk/disclosure`, etc.) remain deferred until there's real evidence consumers' bundles need them.
- **Optional peers must never be imported by value from the main entry point.** The main entry point ships as a single FESM, and a consumer's bundler resolves every top-level import of that file before tree-shaking — an uninstalled optional peer breaks the build even for consumers who never touch the dependent primitive. The sanctioned shapes: (a) **type-only imports** for contract interfaces (`@angular/forms/signals` — erased at compile time, so the optional peer is genuinely optional); (b) a **dedicated secondary entry point** when consumer-facing values of the dependency cross the API (`forty-cdk/internationalized-date` holds the `@internationalized/date` adapters; only consumers importing that entry point need the peer, and it must stay a peer because consumers construct `CalendarDate` values themselves — a bundled copy would break `instanceof`); (c) a **regular `dependency`** (declared in `ng-package.json` `allowedNonPeerDependencies`) when the dependency is internal-only and nothing of it crosses the public API by value (`@floating-ui/dom` — auto-installed, tree-shaken out of non-overlay bundles). Inside a secondary entry point, import the core via the `forty-cdk` specifier, never by relative path.

## Non-negotiable rules

These rules govern every change. They override habits from older Angular code or React ports.

**Banned dependencies / APIs.** No `@angular/material`, `@angular/cdk`, `@angular/aria`. No `NgModule`. No Zone.js — the library must work under `provideZonelessChangeDetection()`; never use `NgZone` or `zone.js/testing`. No third-party runtime deps unless explicitly justified (e.g. `@floating-ui/dom` for positioning, only if agreed).

**Modern Angular style guide (Angular 20+) — no type suffixes anywhere.** Files: `accordion.ts`, `focus-trap.ts` — never `accordion.component.ts`, `focus-trap.service.ts`. Classes: `ForAccordion`, `FocusTrap` — never `ForAccordionComponent`, `FocusTrapService`. The `Service` suffix is explicitly banned; name services for what they represent.

**Required Angular patterns.** Standalone only. `ChangeDetectionStrategy.OnPush` on every component. State with `signal` / `computed` / `linkedSignal` (no `BehaviorSubject` for component state without strong reason). Inputs/outputs as functions: `input()`, `input.required()`, `output()`, `model()` — NEVER `@Input()` / `@Output()` decorators. `inject()` for DI, never constructor injection. Host bindings via the decorator's `host: { ... }` block, never `@HostBinding` / `@HostListener`. Control flow via `@if` / `@for` / `@switch` / `@let`, never `*ngIf` / `*ngFor` / `*ngSwitch`. Prefer `afterNextRender`, `afterEveryRender`, `effect()`, and `DestroyRef` + `takeUntilDestroyed()` over classic lifecycle hooks. `@ContentChild` / `@ViewChild` are only for genuine consumer queries, never for coordinating state between pieces of the same primitive.

**Never propagate state inside `effect()`.** Writing to a signal from an `effect` to derive other state is an anti-pattern (implicit cycles, double change-detection, ordering bugs). `effect()` is for **side effects** only (DOM imperative calls, non-signal subscriptions, logging, focus moves that can't be host bindings). Use `computed()` (pure derivation), `linkedSignal()` (writable state derived from a source), `resource()` / `httpResource()` (async), or `toSignal()` / `toObservable()` (RxJS bridge) instead. Full rationale and the primitive-picker list → `.claude/rules/conventions.md`.

**Form primitives use Signal Forms, never `ControlValueAccessor`.** Any form-value primitive (Switch, Checkbox, RadioGroup, Slider, Combobox, …) implements the matching `@angular/forms/signals` interface — `FormValueControl<T>` (`value: ModelSignal<T>`) or `FormCheckboxControl` (`checked: ModelSignal<boolean>`), both extending `FormUiControl` — so it auto-wires with the `[formField]` directive. `ControlValueAccessor` / `NG_VALUE_ACCESSOR` is banned. `@angular/forms` is an _optional_ peer. Full member list and the `touch` output contract → `.claude/rules/conventions.md`.

**Naming.**

- Public classes use the `For` prefix (`ForAccordion`, `ForAccordionTrigger`). Selectors use the `for-` prefix and default to **attribute** selectors so consumers keep their own HTML semantics (`<button forAccordionTrigger>`); element selectors only when the primitive must inject its own structure via content projection.
- `InjectionToken`s: `FOR_<PRIMITIVE>_CONTEXT`. Boolean inputs without `is`/`has` when natural (`disabled`, `open`, `multiple`). Outputs as present-tense verbs (`openChange`, `select`, `escapeKeyDown`) — never `onX`.
- Reactive accessible name: one uniform `ariaLabel: input<string | null>` defaulting to `null`, host-bound truthy-only (`'[attr.aria-label]': 'ariaLabel() || null'`) on the piece carrying the labelled role.
- Imperative overlay injectables: `For<Primitive>Manager` in `<primitive>-manager.ts`; per-instance handle stays `For<Primitive>Ref`. No plural class names (`ForDialogs`); `Service` suffix still banned.
- Full accessible-labelling placement (per primitive) and the programmatic-services rationale → `.claude/rules/conventions.md`.

**Accessibility is the API.** Every primitive must declare which [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it implements **before any code is written**. Roles, `aria-*` bound to signals, full keyboard interaction, focus management (focus trap, return focus, roving tabindex where applicable), screen-reader announcements via `aria-live`, RTL support, and `prefers-reduced-motion` hooks are all mandatory. Implement focus management in-house — do NOT pull in `@angular/cdk/a11y`.

The cross-primitive conventions (`data-state` vocabulary, ARIA emission tables, `dir` resolver, mount/unmount + overlay API shapes, auto-focus hooks, defaults providers, manager `class`/`classList`, intentional headless exceptions) all live in `.claude/rules/conventions.md`.

## Workflow for new primitives

When asked to add a primitive, follow this order:

1. Cite the exact WAI-ARIA APG URL and summarize roles, states, properties, and keyboard interaction.
2. Design the composition: which pieces, which selectors, which inputs/outputs/models per piece, what context is shared via `InjectionToken`.
3. Confirm the API with the user before implementing if non-trivial design decisions exist.
4. Implement piece by piece, one file each (no type suffixes), respecting every rule above.
5. Tests in parallel — behavior, a11y (roles + aria + keyboard + focus), and explicit zoneless coverage (TestBed configured with `provideZonelessChangeDetection`).
6. A `README.md` inside the primitive folder with a minimal styleless usage example.
7. Verify tree-shaking: the primitive imports cleanly in isolation.

## TypeScript expectations

Root `tsconfig.json` already enforces `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictTemplates` / `strictInjectionParameters` / `strictInputAccessModifiers`. No `any` — use `unknown` and narrow. JSDoc on every public input/output/method/signal because it surfaces in consumer IntelliSense and generated docs. Throw `Error` with messages prefixed `[forty-cdk/<primitive>]`.
