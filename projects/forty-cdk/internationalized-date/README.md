# forty-cdk/internationalized-date

Secondary entry point holding the [`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/) implementations of the `DateAdapter` contract:

- `InternationalizedDateAdapter` / `provideInternationalizedDateAdapter()` — day-granular `CalendarDate`.
- `InternationalizedDateTimeAdapter` / `provideInternationalizedDateTimeAdapter()` — time-capable `CalendarDateTime`.

It exists so the main `forty-cdk` bundle never references `@internationalized/date`: the package is an **optional peer dependency**, required only by consumers who import this entry point. The date/time primitives themselves (`Calendar`, `DateField`, `DatePicker`, `TimeField`) depend only on the abstract `DateAdapter` from the main entry point — `provideNativeDateAdapter()` works with zero extra installs.

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

See the [Calendar README](../calendar/README.md) for the full adapter table and usage examples.
