---
title: Date adapter
group: utilities
archetype: [headless-utility]
---

# Date adapter

The `DateAdapter` contract, the `FOR_DATE_ADAPTER` token that provides one, and the zero-dependency `NativeDateAdapter`, imported from `forty-cdk/date-adapter` so that providing an adapter at the application root does not load the date and time primitives, or the code they share, before bootstrap.

Every date and time primitive (Calendar, Date Field, Date Picker, Time Field, Time Picker) delegates its arithmetic and formatting to the adapter in scope, and none ships a default. Provide one where the [date adapters guide](../../../docs/date-adapters.md) says to, usually the application config:

```ts
import { type ApplicationConfig } from '@angular/core';
import { provideNativeDateAdapter } from 'forty-cdk/date-adapter';

export const appConfig: ApplicationConfig = {
  providers: [provideNativeDateAdapter()],
};
```

`forty-cdk/shared` re-exports the same objects, and `forty-cdk/calendar` re-exports the native pair, so an import from either keeps compiling and binds the same token. Only the import from this entry point keeps the root provider cheap.

## Why this exists

A bundler splits code into chunks one module at a time, and each forty-cdk entry point is published as a single module. A root `providers` array is in the static graph of your `main` bundle, so the module it imports from is loaded before the application bootstraps, on every route. This entry point imports nothing but `@angular/core`, so the code the primitives share stays in the lazy chunks of the routes that render them. `provideInternationalizedDateAdapter()` and `provideInternationalizedDateTimeAdapter()` read the token and the formatter cache from here too.

Measured on a production build of an app with four lazy routes (Tooltip, Calendar, Combobox, Menu) and `provideForTooltipDefaults`, `provideForCalendarDefaults`, `provideForComboboxDefaults` and `provideForMenuDefaults` from [`forty-cdk/defaults`](../defaults) at the root:

| Also at the root                                                           | `main` size (raw / gzip) | Shared chunks the lazy routes load |
| -------------------------------------------------------------------------- | ------------------------ | ---------------------------------- |
| No date adapter                                                            | 209,552 B / 63,580 B     | two                                |
| A `NativeDateAdapter` subclass, imported from `forty-cdk/date-adapter`     | 212,012 B / 64,263 B     | two                                |
| A hand-written adapter on `FOR_DATE_ADAPTER` from `forty-cdk/date-adapter` | 209,723 B / 63,610 B     | two                                |
| The same subclass, imported from `forty-cdk/shared`                        | 246,013 B / 74,209 B     | none: they moved into `main`       |

## API

| Export                       | Kind      | Contract                                                                                                                                                                                                |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DateAdapter<D>`             | interface | The date-library seam every date and time primitive calls. Its members, and the Gregorian and locale limits, are in the [date adapters guide](../../../docs/date-adapters.md#writing-your-own-adapter). |
| `TimeCapableDateAdapter<D>`  | type      | A `DateAdapter<D>` that implements the optional `getHours` / `getMinutes` / `getSeconds` / `setTime`. The time primitives require one.                                                                  |
| `FOR_DATE_ADAPTER`           | token     | Holds the active adapter. A date or time primitive with no adapter in scope throws `FORCDK-CORE-002`.                                                                                                   |
| `NativeDateAdapter`          | class     | A time-capable adapter over the built-in `Date`. Subclass it and override `locale()` to format in the app's language.                                                                                   |
| `provideNativeDateAdapter()` | provider  | Binds `NativeDateAdapter` to `FOR_DATE_ADAPTER`.                                                                                                                                                        |
| `createFormatterCache()`     | function  | Returns a function that hands back one `Intl.DateTimeFormat` per distinct `(locale, options)` pair, for an adapter of your own to format through.                                                       |

`injectDateAdapter` and `assertTimeCapable` are not here: they throw through the library's error helpers, which live with the primitives, and ship from [`forty-cdk/shared`](../shared).
