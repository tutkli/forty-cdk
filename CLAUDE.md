# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Before you start, read the path-scoped rules.** Before designing/implementing a primitive, consult `.claude/rules/conventions.md`; before touching tests, `.claude/rules/testing.md`. Both auto-load when you edit the files they're scoped to (library `*.ts`, and spec/harness/test-config files respectively), so their full detail is in context exactly when it's relevant — this file keeps only what applies to every session.

## Project purpose

`forty-cdk` is an Angular library (ng-packagr) that ships **headless / styleless** UI primitives with WAI-ARIA accessibility built in. Designed from the ground up **idiomatically for modern Angular** — not a port of another framework's patterns. The library exposes state, behavior, focus management, and keyboard interaction; the consumer applies their own styles. New primitives are added as their own secondary entry point under `projects/forty-cdk/<primitive>/` following the rules below.

## Commands

All commands run from repo root unless noted. The Angular workspace contains the library project (`forty-cdk`) and a small dev-only application (`forty-cdk-harness`) used by the Playwright E2E suite — `pnpm build` and `pnpm test` are pinned to the library project so the harness never ships.

The repo uses **pnpm** (pinned via `packageManager` in `package.json`, activated through Corepack). With Corepack enabled (`corepack enable`), running `pnpm <cmd>` in this directory will use the correct version automatically. Otherwise install pnpm globally with `npm i -g pnpm@11`.

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

Single-file / single-test runs use the `@angular/build:unit-test` builder's own flags — `--include` (spec path relative to `projects/forty-cdk/src/`, the spec tsconfig base — so a primitive spec is `../<primitive>/src/<file>.spec.ts`; repeatable for several files) and `--filter` (test/suite-name regex). The `-- <path>` / `-- -t "<name>"` passthrough does **not** work on this setup (pnpm mangles the quoted `--`, so `ng` rejects it):

```bash
pnpm exec ng test forty-cdk --include "../accordion/src/accordion.spec.ts"
pnpm exec ng test forty-cdk --filter "opens on Enter"
```

To consume the built library locally, use the path alias `forty-cdk` → `./dist/forty-cdk` defined in the root `tsconfig.json`.

The Vitest builder / setup-file invariants and the nightly scheduler-hostile shuffle profile are documented in `.claude/rules/testing.md`; the full ESLint enforcement detail (banned imports/syntax/selectors, typescript-eslint hardening, Prettier) is in `.claude/rules/conventions.md`.

## Architecture

- **Workspace layout.** Single Angular CLI workspace, `projectType: library`. The library lives at `projects/forty-cdk/`: `src/public-api.ts` is the main public entry point consumed by ng-packagr (`ng-package.json`); each primitive is its own **secondary entry point** at `projects/forty-cdk/<primitive>/` (own `ng-package.json` pointing at `src/public-api.ts`, imported as `forty-cdk/<primitive>`), and the cross-primitive shared code lives in the `forty-cdk/core` entry point at `projects/forty-cdk/core/src/` (see Tree-shakability below); `src/lib/` now holds only the cross-cutting integration specs — the SSR smoke suite plus the contracts that span primitives instead of belonging to any single one (`ls projects/forty-cdk/src/lib/` is the inventory; a hand-copied list here rots) — and `src/test-utils/` the test helpers; the library's own `package.json` declares `"sideEffects": false` for tree-shaking and pins `@angular/{common,core}` as peers — keep both invariants.
- **Primitives are composable.** A primitive is not a single component; it's a set of standalone directives/components the consumer composes in their template, coordinating via `InjectionToken` + `inject()` (NOT `@ContentChild`). Typical layout:

```
accordion/                  # secondary entry point → forty-cdk/accordion
  ng-package.json           # entryFile: src/public-api.ts
  README.md                 # styleless usage example
  src/
    accordion.ts            # ForAccordion (root)
    accordion-item.ts       # ForAccordionItem
    accordion-trigger.ts    # ForAccordionTrigger
    accordion-content.ts    # ForAccordionContent
    accordion-context.ts    # FOR_ACCORDION_CONTEXT InjectionToken
    accordion-defaults.ts   # provideForAccordionDefaults + FOR_ACCORDION_DEFAULTS (only when the primitive has per-scope tunables)
    accordion.spec.ts
    public-api.ts           # public exports for `forty-cdk/accordion`
```

- **Cross-primitive utilities** (focus trap, live announcer, id generator, roving tabindex, keyboard helpers) live in the `forty-cdk/core` entry point at `projects/forty-cdk/core/src/`, imported by primitives via the `forty-cdk/core` specifier (never a relative path). Each is named for what it does, not its category — `FocusTrap`, `LiveAnnouncer`, `IdGenerator` — never `*Service`.
- **Test utilities** (render helpers, keyboard/focus helpers) live in `projects/forty-cdk/src/test-utils/` and must NOT be re-exported from `public-api.ts`.
- **Tree-shakability is a first-class constraint.** Avoid cross-primitive imports. The main entry point (`forty-cdk`) + `"sideEffects": false` + standalone directives let tree-shakers drop unused primitives — importing only `ForDisclosure` must not pull in `ForAccordion`. On top of that, each primitive ships as its own **secondary entry point** (`forty-cdk/disclosure`, etc.), so a consumer importing from the specific entry gets a bundle their tooling never even sees the other primitives in.
- **Optional peers must never be imported by value from the main entry point.** The main entry point ships as a single FESM, and a consumer's bundler resolves every top-level import of that file before tree-shaking — an uninstalled optional peer breaks the build even for consumers who never touch the dependent primitive. The sanctioned shapes: (a) **type-only imports** for contract interfaces (`@angular/forms/signals` — erased at compile time, so the optional peer is genuinely optional); (b) a **dedicated secondary entry point** when consumer-facing values of the dependency cross the API (`forty-cdk/internationalized-date` holds the `@internationalized/date` adapters; only consumers importing that entry point need the peer, and it must stay a peer because consumers construct `CalendarDate` values themselves — a bundled copy would break `instanceof`); (c) a **regular `dependency`** (declared in `ng-package.json` `allowedNonPeerDependencies`) when the dependency is internal-only and nothing of it crosses the public API by value (`@floating-ui/dom` — auto-installed, tree-shaken out of non-overlay bundles). Inside a secondary entry point, import the core via the `forty-cdk/core` specifier, never by relative path.

## Non-negotiable rules

These rules govern every change. They override habits from older Angular code or React ports.

**Banned dependencies / APIs.** No `@angular/material`, `@angular/cdk`, `@angular/aria`. No `NgModule`. No Zone.js — the library must work under `provideZonelessChangeDetection()`; never use `NgZone` or `zone.js/testing`. No third-party runtime deps unless explicitly justified (e.g. `@floating-ui/dom` for positioning, only if agreed).

**Modern Angular style guide (Angular 20+) — no type suffixes anywhere.** Files: `accordion.ts`, `focus-trap.ts` — never `accordion.component.ts`, `focus-trap.service.ts`. Classes: `ForAccordion`, `FocusTrap` — never `ForAccordionComponent`, `FocusTrapService`. The `Service` suffix is explicitly banned; name services for what they represent.

**Required Angular patterns.** Standalone only. `ChangeDetectionStrategy.OnPush` on every component. State with `signal` / `computed` / `linkedSignal` (no `BehaviorSubject` for component state without strong reason). Inputs/outputs as functions: `input()`, `input.required()`, `output()`, `model()` — NEVER `@Input()` / `@Output()` decorators. `inject()` for DI, never constructor injection. Host bindings via the decorator's `host: { ... }` block, never `@HostBinding` / `@HostListener`. Control flow via `@if` / `@for` / `@switch` / `@let`, never `*ngIf` / `*ngFor` / `*ngSwitch`. Prefer `afterNextRender`, `afterEveryRender`, `effect()`, and `DestroyRef` + `takeUntilDestroyed()` over classic lifecycle hooks. `@ContentChild` / `@ViewChild` are only for genuine consumer queries, never for coordinating state between pieces of the same primitive.

**Never propagate state inside `effect()`.** Writing to a signal from an `effect` to derive other state is an anti-pattern (implicit cycles, double change-detection, ordering bugs). `effect()` is for **side effects** only (DOM imperative calls, non-signal subscriptions, logging, focus moves that can't be host bindings). Use `computed()` (pure derivation), `linkedSignal()` (writable state derived from a source), `resource()` / `httpResource()` (async), or `toSignal()` / `toObservable()` (RxJS bridge) instead. The two shapes that genuinely cannot be derived away each carry a canonical, lint-enforced marker on the `effect(` above them: `@sanctioned-effect(<invariant>)` for a write, and `@sanctioned-pull(<store>)` for a read that exists only to run a lazy fold over a transient source (whose tracked set must not widen a write sharing the effect — the lint bans the pair outright rather than judging the overlap). **Nor is `effect()` a validation channel:** a throw inside one reaches the application `ErrorHandler`, never the consumer, so an assertion goes at its point of use — the call the invalid state degrades — behind an `isDevMode()`-gated `assert*` helper, and the lint fails an effect whose whole body is a `throw` / `assert*` call. Full rationale and the primitive-picker list → `.claude/rules/conventions.md`.

**Form primitives use Signal Forms, never `ControlValueAccessor`.** Any form-value primitive (Switch, Checkbox, RadioGroup, Slider, Combobox, …) implements the matching `@angular/forms/signals` interface — `FormValueControl<T>` (`value: ModelSignal<T>`) or `FormCheckboxControl` (`checked: ModelSignal<boolean>`), both extending `FormUiControl` — so it auto-wires with the `[formField]` directive. `ControlValueAccessor` / `NG_VALUE_ACCESSOR` is banned. `@angular/forms` is an _optional_ peer. Full member list and the `touch` output contract → `.claude/rules/conventions.md`.

**Naming.**

- Public classes use the `For` prefix (`ForAccordion`, `ForAccordionTrigger`). Selectors use the `for-` prefix and default to **attribute** selectors so consumers keep their own HTML semantics (`<button forAccordionTrigger>`); element selectors only when the primitive must inject its own structure via content projection.
- `InjectionToken`s: `FOR_<PRIMITIVE>_CONTEXT`. Boolean inputs without `is`/`has` when natural (`disabled`, `open`, `multiple`). Outputs as present-tense verbs (`openChange`, `activate`, `escapeKeyDown`) — never `onX`.
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
6. Add an SSR smoke fixture for the primitive in `projects/forty-cdk/src/lib/ssr/ssr.spec.ts` — a minimal compose registered in the suite's fixture list so it is asserted to render server-side without throwing. Overlay / `afterNextRender`-gated primitives get an open-state fixture that also asserts `<body>` is untouched. This is mandatory: the library advertises SSR-safe primitives, and a primitive with no server-side assertion can ship a `document` / `window` access that only fails under Angular Universal. See `.claude/rules/testing.md` for the SSR coverage contract.
7. A `README.md` inside the primitive folder with a minimal styleless usage example.
8. Verify tree-shaking: the primitive imports cleanly in isolation.

## TypeScript expectations

Root `tsconfig.json` already enforces `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictTemplates` / `strictInjectionParameters` / `strictInputAccessModifiers`. No `any` — use `unknown` and narrow. JSDoc on every public input/output/method/signal because it surfaces in consumer IntelliSense and generated docs. Throw `Error` with messages prefixed `[forty-cdk/<primitive>]`.
