# Concepts

forty-cdk is one idea applied consistently: **the library owns behaviour, and you own everything else**. Six conventions fall out of that, and they hold across every entry point — learn them once on a Switch and a Table page reads the same way.

This page is the model. The primitive pages are the reference.

---

## Headless and styleless

A primitive ships no CSS, no design tokens and no markup you did not write. What it does ship is the part that is genuinely hard and genuinely reusable: roles and ARIA kept in step with state, keyboard interaction, focus management, and the state machine underneath.

The consequence is that a forty-cdk application looks like nothing until you style it, and looks like _yours_ once you do. There is no theme to override and no specificity war to win, because there is no rule to lose to.

The three hooks you write CSS against are your own class, the `data-*` attributes a primitive reflects, and the `--for-*` custom properties it writes measured values to. [Styling forty-cdk](../styling.md) documents all three.

## Composition over configuration

A primitive is not one component with thirty inputs. It is a set of standalone directives you arrange in your own template, each doing one job:

```html
<div forPopover #popover="forPopover" side="bottom">
  <button forPopoverTrigger>Settings</button>

  @if (popover.open()) {
  <div forPopoverContent>
    <h3 forPopoverTitle>Display</h3>
    <button forPopoverClose>Done</button>
  </div>
  }
</div>
```

The pieces find each other through **dependency injection**, not through content queries: the root provides an `InjectionToken` carrying its context, and every piece `inject()`s it. That choice is what makes the arrangement above yours to rearrange — a piece works wherever it appears in the injector tree, however deeply you wrap it in components of your own, which a `@ContentChild` could not survive.

Selectors are attributes by default (`<button forPopoverTrigger>`) precisely so the element stays yours. A primitive uses an element selector only when it has to inject structure of its own.

## State is reflected, not hidden

Every piece of logical state a primitive holds is written to the DOM as a `data-*` attribute, in a vocabulary that is uniform across the library:

| Values                                      | Meaning               | Where you meet it                         |
| ------------------------------------------- | --------------------- | ----------------------------------------- |
| `open` \| `closed`                          | expand and collapse   | Accordion, Disclosure, every overlay      |
| `active` \| `inactive`                      | one-of-N in a tablist | Tabs                                      |
| `checked` \| `unchecked` \| `indeterminate` | form-control state    | Switch, Checkbox, Radio, selectable items |

Enumerated state is a value you match on; boolean state (`data-disabled`, `data-highlighted`, `data-selected`, …) is **present when true and absent when false**, so it is styled with `[data-disabled]` and `:not([data-disabled])` rather than a `'false'` string that is never written.

The point is that state is stylable without being readable in TypeScript. You do not subscribe to a signal to change an appearance; the attribute is already there.

## Accessibility is the API

Every primitive names the [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern it implements before it has an API at all, and its page links that pattern in the header. Roles, `aria-*` bound to live state, the full keyboard map, focus management — trap, return-focus, roving tabindex, as the pattern requires — RTL, and `prefers-reduced-motion` hooks are the deliverable, not a later pass.

This is why the library is worth taking a dependency on rather than writing a `<div>` with a click handler. It is also the constraint that decides API questions: where a convenient API and an accessible one disagree, the accessible one wins and the README says so.

The limits that apply library-wide — the three cases where a consumer has to do something for accessibility to hold — are documented on the [shared](../../projects/forty-cdk/shared/README.md) entry point.

## One entry point per primitive

Every primitive is its own secondary entry point, imported as `forty-cdk/<primitive>`, and the bare package name exports nothing at all:

```ts
import { ForAccordion, ForAccordionItem } from 'forty-cdk/accordion';
```

Each entry point builds to a module of its own, so a bundle importing Accordion never contains, references or resolves anything belonging to Dialog. That is a structural property rather than a tree-shaking result: the isolation exists before the optimiser runs.

Inside one entry point, `"sideEffects": false` and standalone directives do the rest — a variant you do not import, like the range picker sharing the Date Picker entry point, drops out too.

The same rule is why optional peers stay optional. An entry point never imports a peer by value unless the consumer of _that_ entry point necessarily has it, so `@angular/forms` and `@internationalized/date` cost nothing to skip.

## Mounting is yours, portaling is not

Overlays follow one shape. The root holds the open state and exposes it, you decide whether the content is in the DOM, and the library moves it once it is:

```html
@if (popover.open()) {
<div forPopoverContent>…</div>
}
```

Wrapping content in `@if` means it does not exist while closed — no hidden subtree, no stale form controls, no focusable elements a screen reader can reach. Where an exit animation or a reserved layout slot needs the element to survive, a `[forceMount]` opt-in keeps it mounted and the `data-state` attribute tells your CSS what to do with it.

What the library does own is the **portal**: an overlay's content moves to `document.body` when it opens, so it escapes `overflow: hidden` and stacking contexts. The practical consequence is that component-scoped styles do not reach it — overlay CSS has to be global. [Your first overlay](../your-first-overlay.md) walks the whole shape, and [Styling floating content](../styling-floating-content.md) covers the positioning hooks.

## Zoneless, SSR-safe, signals throughout

Three properties hold everywhere, so no page has to restate them:

- **Zoneless.** Every primitive works under `provideZonelessChangeDetection()`. Nothing imports `NgZone`, and Zone.js is never required.
- **SSR-safe.** No primitive touches `document` or `window` outside a browser-only branch, and each one is covered by a server-render smoke test that fails the build if it starts to.
- **Signals throughout.** State is `signal` / `computed` / `linkedSignal`, inputs and outputs are `input()`, `output()` and `model()`, and DI is `inject()`. What a primitive hands you is a signal you read, not an observable you subscribe to and unsubscribe from.

## Where to go next

- [Getting started](./getting-started.md) — these conventions on one worked example.
- [Installation](./installation.md) — peers, versions and the import model.
- [Wrapping non-form roots](../wrapping-non-form-roots.md) and [Wrapping form primitives](../wrapping-form-primitives.md) — putting a design system on top without losing any of the above.
