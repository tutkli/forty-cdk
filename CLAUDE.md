# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

`forty-cdk` is an Angular library (ng-packagr) that ships **headless / styleless** UI primitives with WAI-ARIA accessibility built in. Inspired by Radix UI and Base UI but reinterpreted **idiomatically for modern Angular** — not a port. The library exposes state, behavior, focus management, and keyboard interaction; the consumer applies their own styles.

Currently, the only code is a placeholder (`projects/forty-cdk/src/lib/forty-cdk.ts`). New primitives are added under `projects/forty-cdk/src/lib/<primitive>/` following the rules below.

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

The `@angular/build:unit-test` builder is configured in `angular.json` to load `vitest.config.ts` from the repo root (`runnerConfig: true`) and to run `projects/forty-cdk/src/test-utils/vitest-invariants-setup.ts` before every spec (`setupFiles`). Together they enforce Vitest's mock-reset / unstub invariants (`clearMocks`, `restoreMocks`, `unstubGlobals`, `unstubEnvs`) so `vi.fn()` call history, `vi.spyOn` patches, and `vi.stubGlobal` / `vi.stubEnv` are reset at the test boundary without relying on per-spec discipline. The setup-file layer is the load-bearing one — at the time of writing the builder does not propagate user `test.*` invariants to the runtime config — and `vitest.config.ts` documents the intended invariants in one canonical place.

A second, scheduler-hostile profile runs nightly via `.github/workflows/test-shuffle.yml` to surface leaks the default isolated schedule masks (polyfills, live regions, fake timers, ad-hoc body children). It declares `pool: 'forks'` + `singleFork: true`, `isolate: false`, `fileParallelism: false`, and `sequence.shuffle.{files, tests}` — gated behind `FORTY_CDK_TEST_WORST_CASE=true` so the default `pnpm test` path stays byte-identical. On `@angular/build@21.2.9` the builder propagates `pool` and `isolate` through to the Vitest runner but strips `fileParallelism` and `sequence.*`; the latter activate automatically the day the builder propagates user config to the runner level (see the comment block in `vitest.config.ts`). Reproduce the nightly locally with `FORTY_CDK_TEST_WORST_CASE=true pnpm test` (Bash) or `$env:FORTY_CDK_TEST_WORST_CASE='true'; pnpm test` (PowerShell). The nightly workflow is non-blocking for PRs — a red run is a signal to investigate against the `### Test isolation — non-negotiables` checklist, not a merge blocker.

Single-file / single-test runs go through Vitest's CLI filtering (the `@angular/build:unit-test` builder forwards args):

```bash
pnpm exec ng test -- projects/forty-cdk/src/lib/accordion/accordion.spec.ts
pnpm exec ng test -- -t "opens on Enter"
```

ESLint (`eslint.config.js`, flat config) mechanically enforces the non-negotiables in this file: banned imports (`@angular/{cdk,material,aria}`, `zone.js`), banned syntax (`NgModule`, `@Input` / `@Output` / `@HostBinding` / `@HostListener` decorators, `Service` / `Component` / `Directive` class suffixes), the `for-` selector prefix on directives and components, SSR-unsafe `document` / `window` globals in library code, plus typescript-eslint hardening (`consistent-type-imports` with inline `import type` style, `no-explicit-any`, `no-unused-vars`). Run `pnpm lint` before committing — CI runs it on every PR — and `pnpm exec eslint . --fix` for auto-fixable rules. Prettier is configured (`.prettierrc`, `printWidth: 100`, single quotes); run it with `pnpm exec prettier --write <path>` when needed.

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
- **Programmatic services**: when a primitive ships an injectable for opening / coordinating overlay instances imperatively (Dialog today; future Toast / Snackbar / HoverCard programmatic), name it `For<Primitive>Manager` and put it in `<primitive>-manager.ts`. The per-instance handle stays `For<Primitive>Ref`. Avoid plural class names (`ForDialogs`) — they collide visually with the directive (`ForDialog`). The `Service` suffix is still banned; `Manager` describes the role (lifecycle + stack of instances), it isn't an empty category tag.

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

The legacy `ControlValueAccessor` / `NG_VALUE_ACCESSOR` pattern is banned. Add `@angular/forms` as an _optional_ peer (`peerDependenciesMeta.optional`) so consumers using only non-form primitives don't pull it in.

`@angular/forms/signals` is `@experimental` in Angular 21. Pin to the matching minor (`^21.x`) and revisit on each Angular bump.

**Accessibility is the API.** Every primitive must declare which [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) it implements **before any code is written**. Roles, `aria-*` bound to signals, full keyboard interaction, focus management (focus trap, return focus, roving tabindex where applicable), screen-reader announcements via `aria-live`, RTL support, and `prefers-reduced-motion` hooks are all mandatory. Implement focus management in-house — do NOT pull in `@angular/cdk/a11y`.

## Cross-primitive conventions

These keep the surface predictable across primitives. Apply them everywhere; deviate only with a written reason.

**`data-state` vocabulary.** Three canonical families, picked semantically — never invent a fourth without listing it in the _Documented alternative vocabularies_ table below:

- `"open" | "closed"` — for things that expand/collapse (`Disclosure`, `Accordion`, `Tooltip`, `Dialog`, future `Popover`/`Menu`/`Drawer`).
- `"active" | "inactive"` — for one-of-N selectables embedded in a tablist-like container (`Tabs` trigger and content). Matches Radix.
- `"checked" | "unchecked" | "indeterminate"` — for form-control state (`Switch`, `Checkbox`, `RadioGroup` items, `Listbox` options, future `Select`/`ToggleGroup`). `"indeterminate"` only on tri-state controls (Checkbox today).

`data-state` is reflected on every piece of the primitive that the consumer might want to style — the root _and_ trigger/content/option/etc. — using the same vocabulary across pieces.

**Documented alternative vocabularies.** A handful of primitives intentionally use a different attribute name or value set because the underlying spec / pattern doesn't fit any of the three families above. New primitives must reuse one of the canonical families unless they have an equally strong reason and update this table:

| Attribute      | Values                                           | Primitives                       | Why                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-state`   | `"visible" \| "hidden"`                          | `ScrollArea` (scrollbar, thumb)  | These pieces have no logical open/closed _state_ — they reflect whether the floating helper is currently rendered/painted, which is a layout outcome, not a toggle.                                         |
| `data-status`  | `"idle" \| "loading" \| "loaded" \| "error"`     | `Avatar` (root, image, fallback) | Mirrors the four-step image lifecycle of Radix's Avatar. None of the three families captures a finite-state-machine with an error terminal.                                                                 |
| `data-state`   | `"indeterminate" \| "loading" \| "complete"`     | `Progress` (root, indicator)     | Mirrors the HTML5 `<progress>` semantics + an explicit `complete` terminal so styling / `aria-live` can fire on the loading→complete edge. `"loading"` is _not_ the same as the form-control `"unchecked"`. |
| `data-quality` | `"optimum" \| "sub-optimum" \| "even-less-good"` | `Meter` (root, indicator)        | Reflects the HTML5 `<meter>` "preferred-value" buckets. This is a styling hook layered _on top of_ `aria-valuenow`; it is not a state toggle and the spec mandates the three names.                         |

**Boolean `data-*` attributes.** Present (with empty string value) when `true`, absent (`null`) when `false`. Never emit `data-disabled="false"`. The Angular host binding `[attr.data-disabled]="disabled() ? '' : null"` is the canonical form. Applies to `data-disabled`, `data-readonly`, `data-highlighted`, and any future boolean reflection (`data-touched`, `data-dirty`, `data-pending`, `data-invalid`).

**`data-highlighted` (sibling vocabulary to `data-state`).** Items that participate in roving-tabindex or `aria-activedescendant` navigation expose a boolean `data-highlighted` when they are the current keyboard-focused candidate. This is distinct from `data-state` (which reflects logical state — `checked`, `open`, etc.) and is the _only_ CSS hook combobox consumers have, since `aria-activedescendant` keeps focus on the input rather than on the option (no `:focus`). Roving-tabindex primitives expose it for parity with the activedescendant flow and for hover-uncoupled-from-focus styling (Radix-aligned). Items reflecting `data-highlighted` today: `Listbox` option, `Menu` item / checkbox-item / radio-item, `Select` option, `Combobox` option.

**ARIA state attribute emission.** WAI-ARIA distinguishes attributes whose absence is semantically meaningful (the consumer's assistive tech knows the default) from attributes whose state machine demands an explicit `"true"` / `"false"` on every render. The library normalizes both groups:

| Attribute                                                                                                                    | Truthy value | Falsy value     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------- |
| `aria-checked`, `aria-pressed`, `aria-expanded`, `aria-selected`                                                             | `"true"`     | `"false"`       |
| `aria-disabled`, `aria-readonly`, `aria-required`, `aria-invalid`, `aria-busy`, `aria-modal`, `aria-haspopup` (boolean form) | `"true"`     | `null` (absent) |

The first row is **always emit** — togglable widgets (toggle buttons, tabs, treeitems, comboboxes, disclosures) have a defined "off" state that screen readers must announce, so the attribute must be present with `"false"` rather than absent. The second row is **truthy-only** — a missing `aria-required` means "not required", emitting `aria-required="false"` is redundant and forces consumers to write `[aria-required="false"]` selectors that fight the spec.

Canonical Angular host bindings:

- Always-emit: `'[attr.aria-checked]': 'checked() ? "true" : "false"'`
- Truthy-only: `'[attr.aria-disabled]': 'disabled() ? "true" : null'`

Two notes for edge cases:

- `aria-haspopup` may take token values (`menu`, `listbox`, `dialog`, `tree`, `grid`); when emitted as a token it is always present (e.g. `'"listbox"'`) and the boolean rule does not apply. Only normalize the boolean form against the truthy-only column.
- `aria-multiselectable` belongs to the truthy-only group. WAI-ARIA defines its default as `false` when the role demands it (`listbox`, `tree`, `grid`), so a missing attribute is unambiguous; emitting `aria-multiselectable="false"` adds noise without changing semantics. Listbox / Combobox / Select content all follow the truthy-only rule.

Consumers styling falsy state must select on **the absence** of the attribute (`:not([aria-disabled])`, `:not([aria-required])`), not on `[aria-disabled="false"]`. The breaking change in [#108](https://github.com/tutkli/forty-cdk/issues/108) enforces this across the library.

**`model()` change emitter contract.** A `model<T>()` already exposes a `<name>Change` output that fires _only_ when the primitive itself updates the signal via `set/update`, and stays silent on consumer writes through `[(name)]`. This already matches Radix's `onValueChange`/`onOpenChange` semantics — **do not add a parallel `output<T>() <name>Change`**, it would shadow or duplicate the implicit one. Document the contract on the `model()` JSDoc instead.

**Orientation + writing direction.** Primitives whose keyboard navigation has an axis expose `orientation: 'horizontal' | 'vertical'` and `dir: 'ltr' | 'rtl'` inputs and pass them to the shared `_internal/keyboard-navigation` helpers. Default to the orientation that matches the primitive's most common layout (`vertical` for `Accordion`/`RadioGroup`/`Listbox`, `horizontal` for `Tabs`). Reflect `data-orientation` on the root container so the consumer can flip CSS.

**Output naming.** `*Change` for value/state transitions emitted by `model()`. Verb outputs (`select`, `escapeKeyDown`, `pointerDownOutside`) for one-shot events — never `onX` (React idiom).

**Mount/unmount and animations.** Primitives **never** apply `[hidden]` to their visible pieces. Presence in the DOM is the consumer's responsibility — they wrap the visible piece with `@if` and use Angular's native `animate.enter` / `animate.leave` for transitions. The directive's job is reactive state + ARIA + behavior; visibility is template control flow. This rule is what unblocks idiomatic Angular animations and forces a clean separation between "is open" (state) and "is mounted" (DOM).

There are two API shapes for primitives that have a visibility/open concept:

- **Free-floating overlays** (Dialog, Drawer, Toast): the instance lifecycle is decoupled from the trigger and the directive owns no `[(open)]` model. The consumer's external signal drives `@if`, and the directive emits a `(close)` output with a `*CloseReason` payload when it wants to be unmounted (Escape, \*Outside, close button, programmatic). Mount == open. Setup (focus trap, scroll lock, dismissable layer, portal, inert siblings, return-focus capture) is owned by `_internal/modal-shell` (`injectModalShell({...})`); the directive contributes ARIA + label / description registration on top. Cleanup runs through the shell's own `DestroyRef` hook.

  ```html
  @if (open()) {
  <div forDialog (close)="open.set(false)" animate.leave="fade-out">…</div>
  }
  ```

- **Trigger-anchored overlays** (Popover, DropdownMenu, ContextMenu, HoverCard, NavigationMenu, Tooltip, Combobox content, Select content): the trigger lives inside the wrapper directive and drives state, so the wrapper exposes `[(open)]` (or `[(value)]` for selection-driven content like Combobox / Select) via a `model<bool>()` / `model<T>()`. The consumer wraps the visible content piece with `@if` driven by the same signal. `data-state` reflects logical open/closed for CSS styling, but is never tied to visibility — that's `@if`'s job.

  ```html
  <div forPopover [(open)]="isOpen">
    <button forPopoverTrigger>Toggle</button>
    @if (isOpen()) {
    <div forPopoverContent animate.leave="fade-out">…</div>
    }
  </div>
  ```

- **Embedded toggle/selection** (Disclosure, Accordion, Tabs, Listbox, future ToggleGroup): same `[(open)]` / `[(value)]` shape as trigger-anchored overlays, but the content piece is part of the document flow rather than a floating layer. The visible content piece still drops `[hidden]`; the consumer wraps it with `@if` driven by the same signal.

  ```html
  <div forDisclosure [(open)]="isOpen">
    <button forDisclosureTrigger>Toggle</button>
    @if (isOpen()) {
    <section forDisclosureContent animate.leave="slide-up">…</section>
    }
  </div>
  ```

The single exception is **Tabs panels**: it's idiomatic to keep all panels mounted to preserve scroll/input state. The consumer can either `@if` per panel or simply leave them mounted and toggle visibility in CSS via `[data-state="active"]`.

Form-value primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox` selection, `Tabs` selection) keep `[(checked)]` / `[(value)]` — that's form state, not visibility, and the rule above doesn't apply.

**Auto-focus hook shape.** Overlay primitives expose two vetoable hooks for the imperative focus moves they perform on mount and unmount: `autoFocusOnOpen` (just before focus enters the surface) and `autoFocusOnClose` (just before focus returns to the trigger). Both deliver a `VetoableEvent`; calling `event.preventDefault()` skips the directive's focus move while leaving the rest of the lifecycle alone. The library deliberately uses two binding shapes for this single contract:

- **Free-floating overlays use `input<((event: VetoableEvent) => void) | undefined>`** — bound as a function reference: `[autoFocusOnOpen]="onOpen"`. Today: **Dialog** (and `ForDialogManager`'s `config.autoFocusOn*`, which is the same callback). The reason is reliability on the close path: a Dialog can be closed via a direct `open.set(false)` from the consumer, which bypasses the `(close)` output entirely. The directive must still fire `autoFocusOnClose` deterministically on every close path — including the destroy hook — so it stores a function reference rather than relying on Angular's `OutputEmitterRef` lifecycle (which doesn't guarantee subscriber delivery during teardown).
- **Trigger-anchored overlays use `output<VetoableEvent>()`** — bound as an event listener: `(autoFocusOnOpen)="…"`. Today: **Popover, DropdownMenu, ContextMenu, Menu sub, Select**, plus any future trigger-anchored overlay. These primitives always route close transitions through their own `model<bool>() open` (and therefore through the implicit `openChange` emitter), so there is no escape hatch that bypasses the output. The output shape stays idiomatic Angular and matches the surrounding dismiss outputs (`(escapeKeyDown)`, `(pointerDownOutside)`, etc.).

| Primitive(s)                                         | Shape                               | Binding                      |
| ---------------------------------------------------- | ----------------------------------- | ---------------------------- |
| Dialog                                               | `input<(e: VetoableEvent) => void>` | `[autoFocusOnOpen]="onOpen"` |
| Popover, DropdownMenu, ContextMenu, Menu sub, Select | `output<VetoableEvent>()`           | `(autoFocusOnOpen)="…"`      |

Combobox is the documented exception that exposes neither hook: `aria-activedescendant` keeps focus on the input the entire time, so there is no imperative focus move to veto. Document any new overlay against this section.

**No `forceMount` / `keepMounted` equivalent for overlays.** The library deliberately does **not** ship a Radix-style `forceMount` or Base-UI-style `keepMounted` opt-in on overlay content directives (`[forDialog]`, popover / tooltip / hover-card / dropdown-menu / context-menu content). Mount == open is structural for these primitives — focus trap, scroll lock, body inert, dismissable layer push, and ARIA modality all hang off the directive's lifetime via `afterNextRender` + `DestroyRef`. Splitting "alive" from "open" would require re-gating every side effect on a separate `open()` signal and inherits a long tail of bugs documented upstream. The single bona-fide use case (handing exit animation control to JS animation libraries) is already covered by `animate.leave` + `@if`, so the consumer never needs the directive to outlive the open state. Revisit only if a real consumer brings a use case `animate.leave` cannot cover; design constraints if accepted are recorded in [#72](https://github.com/tutkli/forty-cdk/issues/72).

**Defaults providers.** Primitives that expose injector-scoped defaults (cadences, offsets, hotkeys, etc.) follow a fixed convention so consumers can predict the API without reading each primitive:

- The provider helper is named `provideFor<Primitive>Defaults(overrides?)`. Always present-tense, always plural `Defaults`, always the `For` prefix (e.g. `provideForTooltipDefaults`, `provideForHoverCardDefaults`, `provideForToastDefaults`). Returns `Provider[]` so callers can spread per-scope companions (a `<Primitive>Coordinator`, etc.) into the same array.
- The injection token is `FOR_<PRIMITIVE>_DEFAULTS` (e.g. `FOR_TOOLTIP_DEFAULTS`, `FOR_HOVER_CARD_DEFAULTS`).
- The defaults shape lives in `<primitive>/<primitive>-defaults.ts`, and is exported as a named interface following `For<Primitive>Defaults` (e.g. `ForToastDefaults`, `ForDialogDefaults`). The presence of `<primitive>-defaults.ts` is enforced by the `forty-cdk/require-defaults-sibling` ESLint rule in `eslint.config.js` — adding a primitive without it fails `pnpm lint` (and therefore CI).
- The merge / inheritance behaviour is owned by the single helper at `_internal/defaults/defaults.ts` (`createDefaults<D>(name, fallback)` returning the `{ token, provideDefaults }` pair). Per key it picks `overrides[k] ?? parent[k] ?? fallback[k]`, where the parent is read via `[[new SkipSelf(), new Optional(), TOKEN]]` so component-level overrides layer on top of app-level overrides on top of the library fallback. Don't hand-write the `useFactory` / `SkipSelf` plumbing in primitive code; route it through `createDefaults` so the inheritance semantics stay identical everywhere.
- Primitives that have no per-scope tunables today still expose a stub (`provideFor<Primitive>Defaults` + `FOR_<PRIMITIVE>_DEFAULTS` + empty `interface`) so future per-scope additions don't churn the public API surface.

**Intentional exceptions to the headless rules.** A few primitives knowingly break a project-wide rule because the underlying behaviour can't be modelled any other way without making the consumer's life worse. Any new exception MUST be added here with rationale before merge:

- **`ScrollAreaViewport` injects global CSS.** The viewport is the only piece in the library that ships a `<style id="for-scroll-area-hide-native">` tag (appended once on first construction) to hide the native scrollbars on `[forScrollAreaViewport]`. The synthetic scrollbars are the entire point of the primitive, so without this the consumer would always see double bars; pure inline styles can't target the platform-specific pseudo-elements (`::-webkit-scrollbar`, `scrollbar-width`). The injected sheet is keyed by id so multiple bundles can't double-insert it.
- **`ScrollAreaCorner` applies `[hidden]`.** The corner has no logical presence when fewer than two scrollbars are visible — keeping it mounted-but-empty would still occupy grid space and bleed into the consumer's layout. Because there is no consumer-meaningful "closed" state to wrap with `@if`, the directive applies `[hidden]` itself. This is the only primitive piece in the library that does so; the rule still stands for everything else.
- **`ForDisclosureContent` reflects `aria-hidden="true"` + `inert` while closed.** The "Mount/unmount and animations" rule above says primitives never apply `[hidden]` to their visible pieces — presence is the consumer's job via `@if`. Disclosure honours that (it never sets `[hidden]`), but additionally reflects `aria-hidden` and `inert` on the panel host while `open()` is `false`. This lets consumers _opt out_ of `@if` and keep the panel mounted-but-closed (for CSS-only transitions or to preserve internal state) while staying a11y-correct: the closed panel is removed from the accessibility tree and from the focus order automatically. Consumers using `@if` still get the same behaviour for free during the brief mounted window before unmount. No other primitive emits these attributes — it is structurally specific to Disclosure's "embedded toggle, optionally always-mounted" shape.

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

### Test isolation — non-negotiables

These invariants are the rationale behind the mechanical enforcement (ESLint rules, Vitest setup file). They exist because each one was, at some point, a bug that bled state across specs or a contract leak that made a refactor harder than it needed to be. A new spec must clear them all.

1. Every `vi.useFakeTimers()` has a matching `vi.useRealTimers()` in `afterEach` of the same `describe` — never inline at the end of an `it`. Inline restores leak timers when the `it` fails before reaching the call.
2. Every `globalThis` polyfill (observers, `fetch`, `matchMedia`) has a matching `afterAll` restore. Prefer the `installObserverPolyfills()` helper in `projects/forty-cdk/src/test-utils/observers.ts` — it already pairs install with restore.
3. Every `addEventListener` installed by test code (not by the directive under test) has a matching `removeEventListener` in `try/finally`. A throwing assertion mid-test must not leave a global listener attached for the next spec.
4. Every `appendChild` to `document.body` from test code is removed in `afterEach` (or `try/finally` in the same `it`). The `TestBed` fixture host is cleaned up for you; ad-hoc body children are not.
5. Overlay specs (any primitive that portals content to `document.body`) call `afterEachOverlayCleanup()` from `projects/forty-cdk/src/test-utils/overlay-cleanup.ts`. It is a leak detector for failing-mid-render scenarios — without it a thrown assertion can orphan the portal and the next spec sees stale ARIA.
6. **No reading directive internal signals from a spec.** The contract is the DOM: ARIA attributes, `data-state`, `data-side`, focus, host-bound classes. Accessing `directive.signalX()` is implementation leakage that locks the directive's private shape into the spec; assert against the rendered DOM instead.
7. `fixture.whenStable()` is used only inside `projects/forty-cdk/src/test-utils/flush.ts`. In specs, always `await flush(fixture)` — it is the canonical waiter and is the only place where the underlying API may change without churning every spec.
8. Geometry assertions (measured dimensions and math derived from them) run in Playwright, not Vitest. Vitest covers wiring (listener attached, callback fired, signal updated) without faking measurements. See the `### E2E (Playwright)` subsection below and [#195](https://github.com/tutkli/forty-cdk/issues/195) for the full rationale and the `*.prototype.getBoundingClientRect` cross-platform trap.
9. E2E selectors use `data-testid="…"`. `#id` selectors are reserved for elements outside any directive — several directives host-bind `[id]` for `aria-controls` wiring and would silently shadow a static `id`.
10. `expect(x).not.toBeNull()` followed by `x!.foo` is noise — drop the assertion. The non-null assertion is already telling the reader (and the compiler) what you know; doubling it adds nothing.
11. Placement / direction assertions use concrete values (`.toBe('top')`, `.toBe('rtl')`), not `.toBeTruthy()`. A truthy check passes for the wrong value just as eagerly as the right one.

### E2E (Playwright)

The Vitest + jsdom suite is the contract layer for ARIA, signals, and the data-state vocabulary, but jsdom mis-models `document.activeElement`, `inert`, and the focus-event order. Real focus management — focus trap, return focus, vetoable `autoFocusOnOpen` / `autoFocusOnClose`, layered Escape, click-outside, disabled-skip in keyboard navigation — runs against real browsers via Playwright.

jsdom returns zeros for layout APIs (`getBoundingClientRect`, `offset*`, `client*`, `scroll*`) and does not run CSS. Geometry-driven assertions — anything that exercises measured dimensions, math derived from dimensions (snap percentages, `closeThreshold * dim`, `'NNpx'` conversion), CSS custom properties populated from `getBoundingClientRect`, or `IntersectionObserver` outcomes — runs against real browsers via Playwright. The Vitest layer asserts wiring (listener attached, callback fired, signal updated) without faking measurements; do not stub `*.prototype.getBoundingClientRect` or any other layout API. The `*.prototype.getBoundingClientRect` pattern in particular is cross-platform fragile: Linux jsdom defines the descriptor on `HTMLElement.prototype` while macOS/Windows jsdom only defines it on `Element.prototype`, and a single-prototype patch is silently shadowed on the rung the runtime actually consults — see [#193](https://github.com/tutkli/forty-cdk/issues/193) for the trail. The library's harness app exposes a per-fixture query-driven viewport (e.g. `drawerHeight`) plus a capturing `ErrorHandler` (records throws onto `window.__fortyCdkHarnessErrors`) so geometry-throwing paths can be asserted from Playwright.

- `playwright.config.ts` (root) targets Chromium + WebKit, parallel, with `webServer: 'ng serve forty-cdk-harness --port 4400'`.
- The harness app under `projects/forty-cdk-harness/` is dev/CI-only. It reads the library by sources via a `paths` override in its `tsconfig.app.json` (`forty-cdk` → `../forty-cdk/src/public-api.ts`), so changes to library code show up without rebuild.
- Per-primitive fixtures live in `projects/forty-cdk-harness/src/app/fixtures/<primitive>.fixture.ts`, mounted on routes `/<primitive>`. Each one exercises focus / keyboard / dismissable behavior for its overlay primitive (Dialog, Popover, DropdownMenu, ContextMenu, Combobox, Tooltip, HoverCard, Select, Listbox) and the `/nested` fixture covers the popover-inside-dialog Escape-stack contract.
- E2E specs live in `projects/forty-cdk-harness/e2e/<primitive>.e2e.ts`. They use `data-testid="…"` rather than `id="…"` for any element bound to a directive — several directives (`forPopoverTrigger`, `forSelectOption`, `forComboboxInput`, etc.) host-bind `[id]` for `aria-controls` wiring and would override a static `id` attribute.
- WebKit-specific `test.fixme()` is reserved for cross-browser bugs the library still owes a fix for (e.g. modal Dialog return-focus race vs `inert`). Don't add a fixme without a clear comment naming the underlying library issue — the suite's value is exposing those, not papering over them.

Adding a primitive's E2E coverage is part of the workflow: open a route, build a small fixture, and write the focus / keyboard / dismissable specs alongside the existing Vitest contract suite.

## TypeScript expectations

Root `tsconfig.json` already enforces `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictTemplates` / `strictInjectionParameters` / `strictInputAccessModifiers`. No `any` — use `unknown` and narrow. JSDoc on every public input/output/method/signal because it surfaces in consumer IntelliSense and generated docs. Throw `Error` with messages prefixed `[forty-cdk/<primitive>]`.
