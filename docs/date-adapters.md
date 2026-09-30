# Date adapters

Every date and time primitive in forty-cdk (`ForCalendar`, `ForDateField`, `ForDatePicker`, `ForTimeField`, `ForTimePicker` and the range variants) does its arithmetic through a `DateAdapter<D>`. The library depends on no date package of its own: you pick the date type, provide one adapter, and every primitive in the family speaks it.

This guide covers which adapter to pick, what the optional peer dependency means for your bundle, and the two limits the seam does not abstract away.

## Pick one adapter, provide it once

An adapter is required. The date primitives resolve it through `injectDateAdapter()` and fail loudly with no provider. Provide exactly one, at the application root or on the component that owns the widget:

| Provider                                | Date type `D`                              | Install                                                      |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `provideInternationalizedDateAdapter()` | `CalendarDate` (`@internationalized/date`) | `@internationalized/date`, an optional peer you add yourself |
| `provideNativeDateAdapter()`            | `Date`                                     | Nothing; it ships with `forty-cdk/calendar`                  |

<!-- snippet: fragment -->

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateAdapter()],
});
```

**Prefer the `@internationalized/date` adapter.** Its values are immutable, so a new value is a new reference and a `computed()` over a date recomputes when, and only when, the date actually changed. `Date` is mutable and compares by identity, which makes the same derivation a source of missed updates in code that does not defensively copy. The package works in every browser today with no polyfill.

`provideNativeDateAdapter()` is the zero-install fallback. Reach for it when adding a dependency is not an option, or when the surrounding application already holds its dates as `Date` and converting at every boundary would cost more than the mutability does.

## Time-capable adapters

A date-only adapter is enough for `ForCalendar` and `ForDateField`. A primitive that edits a time (`ForTimeField`, `ForTimePicker`, and a `ForDateField` with a time granularity) needs a `TimeCapableDateAdapter<D>`, which adds hour/minute/second arithmetic on top:

| Provider                                    | Date type `D`                                  |
| ------------------------------------------- | ---------------------------------------------- |
| `provideInternationalizedDateTimeAdapter()` | `CalendarDateTime` (`@internationalized/date`) |
| `provideNativeDateAdapter()`                | `Date`                                         |

The native adapter is time-capable already (a `Date` carries a time of day), so it is the same provider either way. On the `@internationalized/date` side the two are distinct types, and the day-only `provideInternationalizedDateAdapter()` (`CalendarDate`) has nowhere to put a time.

`assertTimeCapable()` is what a primitive calls when it needs the wider contract, so providing a day-granular adapter to a time primitive is a developer-facing error at the point of use rather than a wrong time silently rendered.

Provide the time-capable adapter for the whole application when any of your date UI edits a time. It satisfies the day-granular contract too, so a calendar under it keeps working unchanged.

## Why `@internationalized/date` is a separate entry point

The adapters live in their own secondary entry point, [`forty-cdk/internationalized-date`](../projects/forty-cdk/internationalized-date/README.md), and nothing else in the library imports the package:

```bash
npm install @internationalized/date
```

Each entry point ships as a single FESM, and a bundler resolves every top-level import in that file before tree-shaking runs. If `forty-cdk/calendar` imported `@internationalized/date`, the package would have to be installed by every consumer of the calendar, including the ones who provide the native adapter and never touch it. Holding the import in an entry point of its own is what makes the dependency genuinely optional: only a consumer who writes `from 'forty-cdk/internationalized-date'` needs it.

It stays a **peer** rather than a bundled dependency for a second reason: you construct `CalendarDate` values yourself, in your own components, and pass them into `[(value)]`. A copy bundled inside forty-cdk would be a different class, and every `instanceof` check on either side would start failing.

## Writing your own adapter

`DateAdapter<D>` is published from [`forty-cdk/shared`](../projects/forty-cdk/shared/README.md) and carries the library's semver guarantee, so an adapter over another date package (Temporal, Luxon, `date-fns`) is a supported thing to write. Implement the contract, provide it through `FOR_DATE_ADAPTER`, and the whole family works over your type.

Two limits are worth knowing before you start.

**The seam abstracts the date library, not the calendar system.** The grid, the month picker and the date field all assume a Gregorian-structured year: exactly twelve months, `month` numbered 1–12, the year ending at month 12. Both `@internationalized/date` adapters build Gregorian dates regardless of the runtime locale. An adapter over a calendar with a different month structure (a 13-month year, say) is not supported, and the optional `compareDate` hook overrides day-only _ordering_ only; it does not make the grid non-Gregorian.

**Formatting is the adapter's, and so is the locale.** Every date and time primitive resolves one locale: its own `[locale]` input when you bind it, then the adapter's optional `locale()`, then the runtime default. Every localized part follows that one locale:

| Part                                                                         | Produced by                                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| Month names, weekday headers, cell labels, picker value text and slot labels | `adapter.format()`                             |
| A segmented field's segment order and separators                             | `Intl.DateTimeFormat` over the resolved locale |
| A field's hour cycle and AM/PM names                                         | `Intl.DateTimeFormat` over the resolved locale |

`[hourCycle]`, or the `hourCycle` key of the primitive's defaults provider, sets the cycle regardless of the locale.

The shipped adapters report `null`, so the runtime locale applies until you say otherwise. To keep every field in the application's language, report it from the adapter once instead of binding `[locale]` on each field. A `locale()` that reads a signal makes every mounted field and formatted value follow a runtime language switch:

```ts
import { Injectable, signal } from '@angular/core';
import { NativeDateAdapter } from 'forty-cdk/calendar';
import { FOR_DATE_ADAPTER } from 'forty-cdk/shared';

@Injectable({ providedIn: 'root' })
export class AppDateAdapter extends NativeDateAdapter {
  readonly language = signal('es-ES');

  override locale(): string | null {
    return this.language();
  }
}

export const appDateAdapterProviders = [{ provide: FOR_DATE_ADAPTER, useExisting: AppDateAdapter }];
```

A custom adapter that implements `format` itself should fall back to its own `locale()` when no `locale` argument is passed, as the shipped ones do, so its formatted names and its fields' layout never disagree.

## Related

- [Calendar](../projects/forty-cdk/calendar/README.md): the grid, and the adapter table in its own words.
- [Date Field](../projects/forty-cdk/date-field/README.md) and [Time Field](../projects/forty-cdk/time-field/README.md): the segmented editors, where granularity decides which contract is required.
- [Date Picker](../projects/forty-cdk/date-picker/README.md) and [Time Picker](../projects/forty-cdk/time-picker/README.md): the overlay compositions.
- [Shared](../projects/forty-cdk/shared/README.md): where `DateAdapter`, `TimeCapableDateAdapter` and `DateRange` are declared.
