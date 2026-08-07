# Shared

The contract surface the primitives share — imported from `forty-cdk/shared`.

Every primitive ships from its own entry point, but their public APIs speak a common vocabulary: a `dir`-resolved `WritingDirection`, the `VetoableEvent` a dismiss handler can cancel, the `DateAdapter` every date/time primitive delegates its arithmetic to, the `FloatingSide` / `FloatingAlign` an anchored overlay is placed on. Those types are declared once, published once, and carry the library's semver guarantee.

## Why this exists

The types live in `forty-cdk/core`, which is **not** a public entry point: it also holds the ~180 engines and DI singletons the library refactors freely, and it exists so every primitive resolves the shared implementation to exactly one compiled module. Publishing the contract types from `forty-cdk/shared` gives them a specifier a consumer can depend on without depending on the engines next to them.

```ts
import { ForTabs, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import type { WritingDirection } from 'forty-cdk/shared';
```

There is nothing to install and — unless you mount more than one forty-cdk app on a page (see [Multiple apps on one page](#multiple-apps-on-one-page)) — nothing to provide: 34 of the 42 exports are structural types erased at compile time, and the eight runtime values resolve to the same singly-compiled module every primitive already loads.

## What it exports

| Family                     | Exports                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Direction / navigation** | `WritingDirection`, `ListNavigationAction`, `RovingTabindex`, `HostRovingItemHandle`                                                                                                                                                                                                             |
| **Floating / geometry**    | `FloatingSide`, `FloatingAlign`, `FloatingFallbackAxisSideDirection`, `Point`, `ElementBox`                                                                                                                                                                                                      |
| **Vetoable events**        | `VetoableEvent`, `VetoableNativeEvent`                                                                                                                                                                                                                                                           |
| **Date / time**            | `DateAdapter`, `TimeCapableDateAdapter`, `assertTimeCapable`, `FOR_DATE_ADAPTER`, `injectDateAdapter`, `DateRange`, `FieldSegment`, `SegmentEditorContext`, `SegmentEditorDelegate`, `SegmentHandle`, `SegmentType`, `DateSegmentType`, `TimeSegmentType`, `FieldGranularity`, `TimeGranularity` |
| **Menu family**            | `FOR_MENU_CONTEXT`, `ForMenuContext`, `ForMenuCloseReason`, `ForMenuItemHandle`, `MenuActivationModality`, `MenuOpenerPositioning`, `MenuSiblingNavigator`                                                                                                                                       |
| **Fieldset**               | `FOR_FIELDSET_CONTEXT`, `ForFieldsetContext`                                                                                                                                                                                                                                                     |
| **Accessible text**        | `accessibleTextContent`                                                                                                                                                                                                                                                                          |
| **Id generation**          | `FOR_ID_SALT`, `provideForIdSalt`                                                                                                                                                                                                                                                                |
| **Other**                  | `ListboxOverlayContext`, `DragPreview`, `SwipeDirection`, `SwipeEventDetail`                                                                                                                                                                                                                     |

Six blessed symbols are **not** here, because a primitive is their semantic home rather than a second path to the same symbol: `ForVisuallyHidden` ships from [`forty-cdk/visually-hidden`](../visually-hidden), `ForDrawerSide` from [`forty-cdk/drawer`](../drawer), and the field-wiring set `FOR_FIELD_CONTEXT` / `ForFieldContext` / `FieldControlHandle` / `injectFieldWiring` from [`forty-cdk/field`](../field).

## Reading a control's accessible text

`accessibleTextContent(node)` concatenates a node's text content while skipping any subtree marked `aria-hidden="true"`, so a decorative indicator glyph, badge or icon contributes nothing while visually-hidden but announced content is kept. It is what the library itself calls to decide what a `[forSelectOption]` / `[forComboboxOption]` is named, what its typeahead matches on, and how a reorder announcement labels the moved option.

Reach for it whenever your own code has to reason about that same text — a truncation tooltip that shows a cell's full label, a filter that matches what the user actually perceives:

```ts
import { accessibleTextContent } from 'forty-cdk/shared';

const label = accessibleTextContent(host).trim();
```

The result is untrimmed, so apply your own `.trim()` when comparing. Deriving the text yourself with `textContent` works until an `aria-hidden` glyph appears inside the host, at which point your definition and the library's silently disagree.

## Multiple apps on one page

Primitives generate the ids that wire `aria-labelledby`, `aria-controls`, and `aria-describedby` between their pieces. Each id is salted, and the salt defaults to Angular's `APP_ID` so that a server render and its client hydration produce byte-identical ids.

Angular's default `APP_ID` is the literal `'ng'`. Two forty-cdk apps mounted side-by-side on the same page therefore start from the same salt **and** the same counter, and emit identical id sequences — duplicate DOM ids. `aria-labelledby` resolves to whichever element appears first in the document, so a screen reader can announce app A's label for app B's control. Nothing looks wrong on screen; the failure is only audible.

Give each app its own salt:

```ts
import { provideForIdSalt } from 'forty-cdk/shared';

bootstrapApplication(AppA, { providers: [provideForIdSalt('a')] });
bootstrapApplication(AppB, { providers: [provideForIdSalt('b')] });
```

Two constraints:

- **The salt must be stable per app, not random.** A runtime random value would make every render unique and break SSR hydration, because the server and client renders would no longer agree on the ids.
- **Prefer this over overriding `APP_ID`.** Setting a distinct global `APP_ID` per app fixes the ids too, but it also drives Angular's hydration store and event replay; `provideForIdSalt` changes only what forty-cdk salts its ids with.

A single app — the common case, including SSR — needs no provider at all.

## Incremental hydration

`@defer (hydrate on interaction | viewport | timer | …)` renders a block on the server and leaves it **dehydrated** on the client: the markup sits in the DOM, but no directive inside it constructs until the trigger fires. That interacts with generated ids, so there is one rule to know before cutting a `@defer` through a primitive.

**Keep a primitive's pieces in the same hydration unit.** Put the whole primitive inside the `@defer` block, or leave all of it outside — never split one across a boundary the root itself sits behind:

```html
<!-- Don't: the root hydrates on its own trigger, so it re-mints the panel's id
     off a drifted counter — and the panel is not there to correct it. -->
@defer (hydrate on viewport) {
<div forDisclosure [(open)]="open">
  <button forDisclosureTrigger>Details</button>
  @defer (hydrate on interaction) {
  <section forDisclosureContent>…</section>
  }
</div>
}

<!-- Do: the whole primitive hydrates as one unit. -->
@defer (hydrate on interaction) {
<div forDisclosure [(open)]="open">
  <button forDisclosureTrigger>Details</button>
  <section forDisclosureContent>…</section>
</div>
}
```

The ids behind `aria-controls`, `aria-labelledby`, `aria-describedby` and `aria-activedescendant` come from a per-application counter, so the server and the client agree only while they mint in the same order. Two properties normally guarantee that, and both survive incremental hydration:

- **Every piece that emits a generated `id` adopts the id already on its host element** — the same seam that preserves a consumer's static `id` — and during hydration that value is the one the server wrote. A hydrated piece therefore keeps the server's id even when the client counter has drifted.
- **Every piece outside all `@defer` blocks mints before any dehydrated block hydrates**, on both sides: the server renders a deferred block's content after the view that contains it, and the client hydrates no block until the initial pass is done. Ids at that level are byte-identical.

Neither covers an id a **deferred** root minted for a piece that is still dehydrated. The root hydrated late, so its counter has drifted from the server's; nothing constructs inside the still-dehydrated piece, so nothing adopts on its behalf; and the reference keeps whatever the drifted counter produced. Two symptoms follow, both invisible on screen:

- **A reference that resolves to nothing.** A screen reader announces no name — or no controlled region — for a control that looks correctly wired in devtools.
- **A reference that resolves to the wrong element.** The client-minted value can equal an id the server minted for a _different_ element, which is still sitting in another dehydrated block. That one does not heal when the blocks hydrate: each element keeps the id the server gave it, so the reference stays pointed at the wrong panel.

**A root outside every `@defer` is the one split that survives**, and it survives on the second property rather than on adoption: the root minted the panel's id during the initial pass, where the two counters are byte-identical, so the reference still matches the id the server left on the dehydrated panel. The suite below pins that. Treat it as a shape that happens to hold rather than one to reach for — two ordinary edits end it, and neither looks like it touches ids: moving the root behind a `@defer` of its own (the case above), and pinning the panel with a static `id` (the case below).

### A static `id` is not the workaround

Pinning the ids yourself is the natural first idea and it makes this shape _worse_ — it is the one split that breaks even with the root outside every `@defer`, where a generated id would have resolved. The library adopts a consumer-set static `id` when the piece's directive constructs; a dehydrated piece never constructs, so the server render adopts your id and the client render cannot. The referring attribute then points at the generated fallback, and nothing in the document carries it:

```html
<div forDisclosure [open]="true">
  <button forDisclosureTrigger>Details</button>
  @defer (hydrate on interaction) {
  <!-- Server: aria-controls="panel". Client: a generated id, resolving to nothing. -->
  <section forDisclosureContent id="panel">…</section>
  }
</div>
```

`provideForIdSalt` does not help either — it changes the salt, not the counter.

Every behaviour on this page — the split that survives, the static `id` that dangles, and the deferred root that re-points at a foreign element — is pinned by [`incremental-hydration.spec.ts`](../src/lib/ssr/incremental-hydration.spec.ts), which drives a real `@angular/platform-server` render through a real client hydration rather than simulating one.

`aria-activedescendant` is the one id relationship that needs no rule: it always names a **mounted** option, whose directive has therefore adopted the server's id, and while the options are dehydrated the attribute is simply absent rather than stale.

## Migration

Before this entry point existed, each of these symbols was re-exported by every primitive barrel whose API referenced it — 37 barrels, `WritingDirection` alone in 29 of them. Those re-exports are gone: import from `forty-cdk/shared` instead. The symbols, their shapes and their runtime identity are unchanged, so the migration is a specifier rewrite.

```ts
// before
import { ForTabs, type WritingDirection } from 'forty-cdk/tabs';
import { provideNativeDateAdapter, type DateRange } from 'forty-cdk/calendar';

// after
import { ForTabs } from 'forty-cdk/tabs';
import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import type { DateRange, WritingDirection } from 'forty-cdk/shared';
```

| Old import path                                                                                                                                                                                             | Symbols                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `forty-cdk/accordion`, `carousel`, `listbox`, `navigation-menu`, `radio-group`, `stepper`, `tabs`, `toggle`, `tree`, `drag-drop`, `pagination`, `pane-resizer`, `slider`, `table`, `scroll-area`, `toolbar` | `WritingDirection`, `ListNavigationAction`, `RovingTabindex`, `HostRovingItemHandle`, `DragPreview`, `ElementBox`                                                                                                                                                                                |
| `forty-cdk/combobox`, `select`, `popover`, `tooltip`, `hover-card`, `dialog`, `drawer`, `menu`, `menubar`, `dropdown-menu`, `context-menu`, `date-picker`, `time-picker`                                    | `FloatingSide`, `FloatingAlign`, `FloatingFallbackAxisSideDirection`, `Point`, `VetoableEvent`, `VetoableNativeEvent`, `ListboxOverlayContext`, `FOR_MENU_CONTEXT`, `ForMenuContext`, `ForMenuCloseReason`, `ForMenuItemHandle`, `MenuActivationModality`, `MenuSiblingNavigator`                |
| `forty-cdk/calendar`, `date-field`, `time-field`, `internationalized-date`                                                                                                                                  | `DateAdapter`, `TimeCapableDateAdapter`, `assertTimeCapable`, `FOR_DATE_ADAPTER`, `injectDateAdapter`, `DateRange`, `FieldSegment`, `SegmentEditorContext`, `SegmentEditorDelegate`, `SegmentHandle`, `SegmentType`, `DateSegmentType`, `TimeSegmentType`, `FieldGranularity`, `TimeGranularity` |
| `forty-cdk/fieldset`                                                                                                                                                                                        | `FOR_FIELDSET_CONTEXT`, `ForFieldsetContext`                                                                                                                                                                                                                                                     |
| `forty-cdk/toast`                                                                                                                                                                                           | `SwipeDirection`, `SwipeEventDetail`                                                                                                                                                                                                                                                             |

One rename comes with the move: `SegmentType` was also published as `DateTimeSegmentType` from `forty-cdk/date-field` and the then-separate `forty-cdk/date-range-field`. The alias is dropped — a blessed contract has one name, so `import type { SegmentType } from 'forty-cdk/shared'` replaces it.

## Notes

- **Not a primitive.** There are no directives here and nothing to add to `imports`.
- **Not `forty-cdk/core`.** `core` stays resolvable — the primitives import it by specifier, which is what keeps `LiveAnnouncer`, the focus-trap and dismissible-layer stacks, and the id-generator salt single-instance — but it carries no semver guarantee. If a symbol you need is not exported here, it is internal by design; open an issue rather than importing from `core`.
- **Tree-shakes to nothing.** The types vanish at compile time and the eight values sit in the core module your primitives already pull, so importing from here adds no code to your bundle.
