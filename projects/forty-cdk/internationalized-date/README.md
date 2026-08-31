---
title: Internationalized Date
group: none
archetype: [headless-utility]
---

# forty-cdk/internationalized-date

Secondary entry point holding the [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) implementations of the `DateAdapter` contract:

- `InternationalizedDateAdapter` / `provideInternationalizedDateAdapter()` — day-granular `CalendarDate`.
- `InternationalizedDateTimeAdapter` / `provideInternationalizedDateTimeAdapter()` — time-capable `CalendarDateTime`.

It exists so no other entry point references `@internationalized/date`: the package is an **optional peer dependency**, required only by consumers who import this one. The date/time primitives themselves (`Calendar`, `DateField`, `DatePicker`, `TimeField`, `TimePicker`) depend only on the abstract `DateAdapter` contract from `forty-cdk/shared` — `provideNativeDateAdapter()` works with zero extra installs.

```bash
npm install @internationalized/date
```

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

bootstrapApplication(App, {
  providers: [provideInternationalizedDateAdapter()],
});
```

The [Date adapters](../../../docs/date-adapters.md) guide is where the site documents this entry point: which adapter to pick, what the optional peer means for your bundle, and the two limits the adapter seam does not abstract away. The [Calendar README](../calendar/README.md) carries the adapter table beside the grid that reads it.
