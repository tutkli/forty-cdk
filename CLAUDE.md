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

| Attribute      | Values                                           | Primitives                                                    | Why                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-state`   | `"visible" \| "hidden"`                          | `ScrollArea` (scrollbar, thumb), `NavigationMenu` (indicator) | These pieces have no logical open/closed _state_ — they reflect whether the floating helper is currently rendered/painted, which is a layout outcome, not a toggle.                                         |
| `data-status`  | `"idle" \| "loading" \| "loaded" \| "error"`     | `Avatar` (root, image, fallback)                              | Mirrors the four-step image lifecycle of Radix's Avatar. None of the three families captures a finite-state-machine with an error terminal.                                                                 |
| `data-state`   | `"indeterminate" \| "loading" \| "complete"`     | `Progress` (root, indicator)                                  | Mirrors the HTML5 `<progress>` semantics + an explicit `complete` terminal so styling / `aria-live` can fire on the loading→complete edge. `"loading"` is _not_ the same as the form-control `"unchecked"`. |
| `data-quality` | `"optimum" \| "sub-optimum" \| "even-less-good"` | `Meter` (root, indicator)                                     | Reflects the HTML5 `<meter>` "preferred-value" buckets. This is a styling hook layered _on top of_ `aria-valuenow`; it is not a state toggle and the spec mandates the three names.                         |

**Boolean `data-*` attributes.** Present (with empty string value) when `true`, absent (`null`) when `false`. Never emit `data-disabled="false"`. The Angular host binding `[attr.data-disabled]="disabled() ? '' : null"` is the canonical form. Applies to `data-disabled`, `data-readonly`, `data-highlighted`, and any future boolean reflection (`data-touched`, `data-dirty`, `data-pending`, `data-invalid`).

**`data-highlighted` (sibling vocabulary to `data-state`).** Items that participate in roving-tabindex or `aria-activedescendant` navigation expose a boolean `data-highlighted` when they are the current keyboard-focused candidate. This is distinct from `data-state` (which reflects logical state — `checked`, `open`, etc.) and is the _only_ CSS hook combobox consumers have, since `aria-activedescendant` keeps focus on the input rather than on the option (no `:focus`). Roving-tabindex primitives expose it for parity with the activedescendant flow and for hover-uncoupled-from-focus styling (Radix-aligned). Items reflecting `data-highlighted` today: `Listbox` option, `Menu` item / checkbox-item / radio-item, `Select` option, `Combobox` option.

**`model()` change emitter contract.** A `model<T>()` already exposes a `<name>Change` output that fires _only_ when the primitive itself updates the signal via `set/update`, and stays silent on consumer writes through `[(name)]`. This already matches Radix's `onValueChange`/`onOpenChange` semantics — **do not add a parallel `output<T>() <name>Change`**, it would shadow or duplicate the implicit one. Document the contract on the `model()` JSDoc instead.

**Orientation + writing direction.** Primitives whose keyboard navigation has an axis expose `orientation: 'horizontal' | 'vertical'` and `dir: 'ltr' | 'rtl'` inputs and pass them to the shared `_internal/keyboard-navigation` helpers. Default to the orientation that matches the primitive's most common layout (`vertical` for `Accordion`/`RadioGroup`/`Listbox`, `horizontal` for `Tabs`). Reflect `data-orientation` on the root container so the consumer can flip CSS.

**Output naming.** `*Change` for value/state transitions emitted by `model()`. Verb outputs (`select`, `escapeKeyDown`, `pointerDownOutside`) for one-shot events — never `onX` (React idiom).

**Mount/unmount and animations.** Primitives **never** apply `[hidden]` to their visible pieces. Presence in the DOM is the consumer's responsibility — they wrap the visible piece with `@if` and use Angular's native `animate.enter` / `animate.leave` for transitions. The directive's job is reactive state + ARIA + behavior; visibility is template control flow. This rule is what unblocks idiomatic Angular animations and forces a clean separation between "is open" (state) and "is mounted" (DOM).

There are two API shapes for primitives that have a visibility/open concept:

- **Floating overlays** (Dialog, future Popover / Menu / Drawer / Toast / HoverCard): the trigger lives outside the surface; the consumer's signal drives `@if` and the directive emits a `(close)` output with a `*CloseReason` payload when it wants to be unmounted (Escape, \*Outside, close button, programmatic). **No `[(open)]` model.** Mount == open. Setup (focus trap, scroll lock, dismissable layer) runs in `afterNextRender` so input bindings are settled; cleanup runs in `DestroyRef`.

  ```html
  @if (open()) {
  <div forDialog (close)="open.set(false)" animate.leave="fade-out">…</div>
  }
  ```

- **Embedded toggle/selection** (Disclosure, Accordion, Tabs, Tooltip, Listbox, future ToggleGroup): the trigger lives inside the wrapper and drives state, so `[(open)]` / `[(value)]` is correct. The visible content piece still drops `[hidden]`; the consumer wraps it with `@if` driven by the same signal (or a template ref to the directive). `data-state` reflects logical open/closed for CSS styling, but is never tied to visibility — that's `@if`'s job.

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

**Intentional exceptions to the headless rules.** A few primitives knowingly break a project-wide rule because the underlying behaviour can't be modelled any other way without making the consumer's life worse. Any new exception MUST be added here with rationale before merge:

- **`ScrollAreaViewport` injects global CSS.** The viewport is the only piece in the library that ships a `<style id="for-scroll-area-hide-native">` tag (appended once on first construction) to hide the native scrollbars on `[forScrollAreaViewport]`. The synthetic scrollbars are the entire point of the primitive, so without this the consumer would always see double bars; pure inline styles can't target the platform-specific pseudo-elements (`::-webkit-scrollbar`, `scrollbar-width`). The injected sheet is keyed by id so multiple bundles can't double-insert it.
- **`ScrollAreaCorner` applies `[hidden]`.** The corner has no logical presence when fewer than two scrollbars are visible — keeping it mounted-but-empty would still occupy grid space and bleed into the consumer's layout. Because there is no consumer-meaningful "closed" state to wrap with `@if`, the directive applies `[hidden]` itself. This is the only primitive piece in the library that does so; the rule still stands for everything else.

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
