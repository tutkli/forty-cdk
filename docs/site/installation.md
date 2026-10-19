# Installation

forty-cdk is a single unscoped npm package that ships one **secondary entry point per primitive**. Installing it adds no styles, no global CSS and no `NgModule` to your application, only the directives you import.

---

## Install

```bash
npm install forty-cdk
```

The package is unscoped, so `pnpm add forty-cdk` and `yarn add forty-cdk` are the same install.

Nothing else is required to render your first primitive. The packages forty-cdk needs internally (`@floating-ui/dom` for overlay positioning, `@tanstack/virtual-core` for virtualization) are regular dependencies installed with it, and they are tree-shaken out of bundles that import no overlay and no virtualized list.

## Peer dependencies

Three peers are required, and every other one is optional and unlocks a specific part of the library.

| Peer                        | Range     | Required | What it is for                                                                        |
| --------------------------- | --------- | -------- | ------------------------------------------------------------------------------------- |
| `@angular/core`             | `^22.1.0` | Yes      | Signals, standalone directives and DI, which the whole library is built on.           |
| `@angular/common`           | `^22.1.0` | Yes      | `DOCUMENT`, platform checks and the SSR-safe branches every primitive takes.          |
| `@angular/platform-browser` | `^22.1.0` | Yes      | `CssVarNamespacer`, so every `--for-*` property follows `provideCssVarNamespacing()`. |
| `@angular/forms`            | `^22.1.0` | No       | Signal Forms. Needed by the form-control primitives, which bind with `[formField]`.   |
| `@internationalized/date`   | `^3.0.0`  | No       | The calendar adapters behind `forty-cdk/internationalized-date`.                      |

An optional peer you have not installed costs you nothing. Nothing outside the entry point that needs it imports it by value, so a bundle that never touches Signal Forms never resolves `@angular/forms`.

The types follow the same line. The declarations of the form-control entry points (`forty-cdk/checkbox`, `combobox`, `date-field`, `date-picker`, `input`, `listbox`, `number-input`, `otp-input`, `radio-group`, `search`, `select`, `slider`, `switch`, `time-field`, `time-picker` and `toggle`) import `@angular/forms/signals`, so a project that type-checks its dependencies (`skipLibCheck: false`) needs the peer once it imports one of them. Every other entry point compiles without it.

If you are choosing a date adapter, the [Date adapters](../date-adapters.md) guide is the page that answers which one to provide.

## The import model

**`forty-cdk` itself exports nothing.** This is deliberate, and it is the one thing about the package that surprises people:

<!-- snippet: expect-error TS2305 -->

```ts
import { ForDialog } from 'forty-cdk';
```

That import resolves to an empty barrel and fails to compile. Every primitive is imported from its own entry point instead:

```ts
import { ForDialog, ForDialogTitle, ForDialogTrigger } from 'forty-cdk/dialog';
import { ForSwitch } from 'forty-cdk/switch';
```

The entry point is the primitive's folder name, lower-kebab: `forty-cdk/date-picker`, `forty-cdk/dropdown-menu`, `forty-cdk/hover-card`. Each primitive page on this site shows its entry point in the page header, under the title.

The reason is bundle size. Each entry point builds to a module of its own, so importing `ForSwitch` gives your bundler a file it can resolve without ever seeing Dialog, Table or Calendar. A single root barrel re-exporting every entry point would put them all on one module graph and make that isolation a tree-shaker's problem rather than a structural fact. Leaving the root empty is what removes the question (see [why the root barrel is empty](https://github.com/tutkli/forty-cdk/issues/1590)).

Five entry points are shared rather than per-primitive:

- **[`forty-cdk/shared`](../../projects/forty-cdk/shared/README.md)**: the cross-primitive contracts a consumer meets in more than one place, and the accessibility limits that apply library-wide.
- **[`forty-cdk/defaults`](../../projects/forty-cdk/defaults/README.md)**: every `provideFor<Primitive>Defaults` provider with its token and interface. Each primitive re-exports its own pair, but a provider in your application config imported from the primitive loads that primitive at startup; imported from here, it does not.
- **[`forty-cdk/date-adapter`](../../projects/forty-cdk/date-adapter/README.md)**: the `DateAdapter` contract, the `FOR_DATE_ADAPTER` token and `provideNativeDateAdapter`. Import the provider from here rather than from `forty-cdk/shared`, for the same startup reason.
- **`forty-cdk/internationalized-date`**: the `@internationalized/date` calendar adapters, kept apart so only consumers who provide one need that peer.
- **[`forty-cdk/testing`](../../projects/forty-cdk/testing/README.md)**: spec helpers for code built on forty-cdk, such as browser-shaped keyboard and pointer events and stubs for the browser APIs jsdom lacks.

## Angular version support

forty-cdk targets **Angular 22**: the peer range is `^22.1.0`, so an Angular 23 application needs a forty-cdk release built for it. Within that major the library tracks the latest minor. The library is pre-1.0, so a breaking change can land in a minor release. Pin the version you build against and read the [changelog](https://github.com/tutkli/forty-cdk/blob/main/CHANGELOG.md) before upgrading.

Two application-level requirements are worth stating, because both are properties of the library rather than settings you turn on:

- **Zoneless is supported, and Zone.js is never required.** Every primitive works under `provideZonelessChangeDetection()`; none of them import `NgZone`. If your application still runs with Zone.js, nothing here changes.
- **Server-side rendering is safe by default.** No primitive touches `document` or `window` outside a browser-only branch, and every one of them is covered by a server-render smoke test.

## Next steps

- [Getting started](./getting-started.md): from this install to a working, styled primitive.
- [Concepts](./concepts.md): the composition model, `data-*` state and the entry-point layout.
- [Styling forty-cdk](../styling.md): the three hooks you write CSS against.
