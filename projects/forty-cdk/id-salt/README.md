---
title: Id salt
group: utilities
archetype: [headless-utility]
---

# Id salt

The `FOR_ID_SALT` token and the `provideForIdSalt` provider that salt the ids the primitives generate, imported from `forty-cdk/id-salt` so that giving an app its own salt at the application root does not load the code the primitives share before bootstrap.

A single app needs no salt: it defaults to Angular's `APP_ID`, so a server render and its client hydration produce the same ids. Two forty-cdk apps mounted on one page do need one each, or they emit the same id sequences and `aria-labelledby` resolves across app boundaries. [Multiple apps on one page](../shared/README.md#multiple-apps-on-one-page) explains the failure and the constraints on the salt:

<!-- snippet: fragment -->

```ts
import { provideForIdSalt } from 'forty-cdk/id-salt';

bootstrapApplication(AppA, { providers: [provideForIdSalt('a')] });
bootstrapApplication(AppB, { providers: [provideForIdSalt('b')] });
```

`forty-cdk/shared` re-exports the same token and provider, so an import from there keeps compiling and salts the same ids. Only the import from this entry point keeps the root provider cheap.

## Why this exists

A bundler splits code into chunks one module at a time, and each forty-cdk entry point is published as a single module. A root `providers` array is in the static graph of your `main` bundle, so the module it imports from is loaded before the application bootstraps, on every route. This entry point imports nothing but `@angular/core`, so the code the primitives share stays in the lazy chunks of the routes that render them.

Measured on a production build of an app with four lazy routes (Tooltip, Tabs, Switch, Accordion):

| At the root                                      | `main` size (raw / gzip) | Shared chunks the lazy routes load |
| ------------------------------------------------ | ------------------------ | ---------------------------------- |
| No salt                                          | 223,434 B / 68,420 B     | two                                |
| `provideForIdSalt('a')` from `forty-cdk/id-salt` | 223,655 B / 68,491 B     | two                                |
| `provideForIdSalt('a')` from `forty-cdk/shared`  | 283,812 B / 89,336 B     | none: they moved into `main`       |

## API

| Export                   | Kind     | Contract                                                                                                                                                                |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FOR_ID_SALT`            | token    | Holds the salt mixed into every generated id. Defaults to `APP_ID`. Inject it to read the resolved salt.                                                                |
| `provideForIdSalt(salt)` | provider | Binds `salt` to `FOR_ID_SALT`. The salt must be stable per app and contain no whitespace; in dev mode generating an id with a whitespace salt throws `FORCDK-CORE-012`. |
