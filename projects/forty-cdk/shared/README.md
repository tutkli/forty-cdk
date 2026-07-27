# Shared

The contract surface the primitives share — imported from `forty-cdk/shared`.

Every primitive ships from its own entry point, but their public APIs speak a common vocabulary: a `dir`-resolved `WritingDirection`, the `VetoableEvent` a dismiss handler can cancel, the `DateAdapter` every date/time primitive delegates its arithmetic to, the `FloatingSide` / `FloatingAlign` an anchored overlay is placed on. Those types are declared once, published once, and carry the library's semver guarantee.

## Why this exists

The types live in `forty-cdk/core`, which is **not** a public entry point: it also holds the ~260 engines and DI singletons the library refactors freely, and it exists so every primitive resolves the shared implementation to exactly one compiled module. Publishing the contract types from `forty-cdk/shared` gives them a specifier a consumer can depend on without depending on the engines next to them.

```ts
import { ForTabs, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import type { WritingDirection } from 'forty-cdk/shared';
```

There is nothing to install and nothing to provide: 33 of the 38 exports are structural types erased at compile time, and the five runtime values resolve to the same singly-compiled module every primitive already loads.

## What it exports

| Family                     | Exports                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Direction / navigation** | `WritingDirection`, `ListNavigationAction`, `RovingTabindex`, `HostRovingItemHandle`                                                                                                                                                                                                             |
| **Floating / geometry**    | `FloatingSide`, `FloatingAlign`, `FloatingFallbackAxisSideDirection`, `Point`, `ElementBox`                                                                                                                                                                                                      |
| **Vetoable events**        | `VetoableEvent`, `VetoableNativeEvent`                                                                                                                                                                                                                                                           |
| **Date / time**            | `DateAdapter`, `TimeCapableDateAdapter`, `assertTimeCapable`, `FOR_DATE_ADAPTER`, `injectDateAdapter`, `DateRange`, `FieldSegment`, `SegmentEditorContext`, `SegmentEditorDelegate`, `SegmentHandle`, `SegmentType`, `DateSegmentType`, `TimeSegmentType`, `FieldGranularity`, `TimeGranularity` |
| **Menu family**            | `FOR_MENU_CONTEXT`, `ForMenuContext`, `ForMenuCloseReason`, `ForMenuItemHandle`, `MenuActivationModality`, `MenuSiblingNavigator`                                                                                                                                                                |
| **Fieldset**               | `FOR_FIELDSET_CONTEXT`, `ForFieldsetContext`                                                                                                                                                                                                                                                     |
| **Other**                  | `ListboxOverlayContext`, `DragPreview`, `SwipeDirection`, `SwipeEventDetail`                                                                                                                                                                                                                     |

Three blessed contracts are **not** here, because a primitive is their semantic home rather than a second path to the same symbol: `ForVisuallyHidden` ships from [`forty-cdk/visually-hidden`](../visually-hidden), `ForDrawerSide` from [`forty-cdk/drawer`](../drawer), and the field-wiring set `FOR_FIELD_CONTEXT` / `ForFieldContext` / `FieldControlHandle` / `injectFieldWiring` from [`forty-cdk/field`](../field).

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
| `forty-cdk/calendar`, `date-field`, `date-range-field`, `time-field`, `time-range-field`, `internationalized-date`                                                                                          | `DateAdapter`, `TimeCapableDateAdapter`, `assertTimeCapable`, `FOR_DATE_ADAPTER`, `injectDateAdapter`, `DateRange`, `FieldSegment`, `SegmentEditorContext`, `SegmentEditorDelegate`, `SegmentHandle`, `SegmentType`, `DateSegmentType`, `TimeSegmentType`, `FieldGranularity`, `TimeGranularity` |
| `forty-cdk/fieldset`                                                                                                                                                                                        | `FOR_FIELDSET_CONTEXT`, `ForFieldsetContext`                                                                                                                                                                                                                                                     |
| `forty-cdk/toast`                                                                                                                                                                                           | `SwipeDirection`, `SwipeEventDetail`                                                                                                                                                                                                                                                             |

One rename comes with the move: `SegmentType` was also published as `DateTimeSegmentType` from `forty-cdk/date-field` and `forty-cdk/date-range-field`. The alias is dropped — a blessed contract has one name, so `import type { SegmentType } from 'forty-cdk/shared'` replaces it.

## Notes

- **Not a primitive.** There are no directives here and nothing to add to `imports`.
- **Not `forty-cdk/core`.** `core` stays resolvable — the primitives import it by specifier, which is what keeps `LiveAnnouncer`, the focus-trap and dismissable-layer stacks, and the id-generator salt single-instance — but it carries no semver guarantee. If a symbol you need is not exported here, it is internal by design; open an issue rather than importing from `core`.
- **Tree-shakes to nothing.** The types vanish at compile time and the five values sit in the core module your primitives already pull, so importing from here adds no code to your bundle.
