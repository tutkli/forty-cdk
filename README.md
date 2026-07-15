<div align="center">

# forty-cdk

**Headless, styleless UI primitives for modern Angular — accessibility built in.**

[![npm version](https://img.shields.io/npm/v/forty-cdk.svg)](https://www.npmjs.com/package/forty-cdk)
[![CI](https://github.com/tutkli/forty-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/tutkli/forty-cdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-22%2B-dd0031.svg)

accessible · zoneless · SSR-safe · tree-shakable

</div>

---

forty-cdk exposes the **state, behavior, focus management, and keyboard interaction** of each
component; you bring your own styles. Every primitive is designed from the ground up for modern
Angular — the API is built around signals, standalone directives, and dependency-injection
composition.

## Why forty-cdk

|                                                                                                                                                                                 |                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **♿&nbsp; Accessibility is the API** — every primitive implements a [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) pattern: roles, keyboard, focus management, RTL. | **🎨&nbsp; Styleless** — you get behavior and state; style against your own class, `data-*` state attributes and `--for-*` custom properties. |
| **⚡&nbsp; Modern Angular** — `signal` / `computed` / `input()` / `model()`, standalone directives and DI composition throughout.                                               | **🌳&nbsp; Tree-shakable** — one secondary entry point per primitive; your bundle ships only what you import.                                 |
| **🚫&nbsp; Zoneless** — works under `provideZonelessChangeDetection()`. No Zone.js, ever.                                                                                       | **🖥️&nbsp; SSR-safe** — every primitive is covered by a server-render smoke test.                                                             |

## Installation

```bash
npm install forty-cdk
```

Requires `@angular/common` and `@angular/core` `^22.0.0`. Some primitives have optional peers
(`@angular/forms`, `@internationalized/date`) — see the
[peer dependency reference](projects/forty-cdk/README.md#peer-dependencies).

## Quick start

Every primitive is a set of standalone directives you compose in your own markup. Import from the
per-primitive entry point, add the `for*` directive, style against the reflected `data-*` state:

```ts
import { Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'demo-toggle',
  imports: [ForSwitch],
  template: `
    <button forSwitch class="switch" [(checked)]="enabled">
      <span class="thumb"></span>
    </button>
  `,
})
export class DemoToggle {
  readonly enabled = signal(false);
}
```

```css
.switch .thumb {
  transition: transform 150ms;
}
.switch[data-state='checked'] .thumb {
  transform: translateX(100%);
}
```

New to the composition model? [**Your first overlay**](docs/your-first-overlay.md) walks one Popover
from empty markup to styled-and-animated.

## What's inside

Accessible primitives grouped by purpose. See the
[**full catalog with descriptions »**](projects/forty-cdk/README.md#primitives) — each links to its
own README with anatomy, API, keyboard map and styling hooks.

- **Overlays** — Dialog, Drawer, Popover, Hover Card, Tooltip, Toast
- **Menus** — Menu, Dropdown Menu, Context Menu, Menubar
- **Navigation** — Navigation Menu, Breadcrumbs, Pagination, Tabs, Toolbar, Stepper
- **Forms & input** — Button, Field, Fieldset, Input, Search, Number Input, OTP Input, File Upload, Switch, Checkbox, Toggle, Radio Group, Slider, Select, Combobox, Listbox
- **Date & time** — Calendar, Date Field, Date Picker, Date Range Field, Time Field, Time Picker, Time Range Field
- **Disclosure & content** — Accordion, Disclosure, Carousel
- **Data & layout** — Table, Tree, Scroll Area, Pane Resizer, Separator, Aspect Ratio, Avatar
- **Feedback** — Progress, Meter
- **Utilities** — Breakpoints, Drag & Drop, Virtualization

## Documentation

- [**Library README**](projects/forty-cdk/README.md) — installation, peer dependencies and the full
  primitive catalog.
- [**Your first overlay**](docs/your-first-overlay.md) — one Popover from empty markup to
  styled-and-animated, explaining the `@if` / open-state model and the portal → global CSS
  requirement every overlay shares.
- [**Styling forty-cdk**](docs/styling.md) — the three hooks you style against: your own class,
  `data-*` state attributes, and `--for-*` custom properties.
- [`docs/`](docs) — the remaining guides (styling floating content, the selected-indicator
  pattern, wrapping form primitives).
- [CHANGELOG](CHANGELOG.md) — release notes.

## Development

This is an Angular CLI workspace with the `forty-cdk` library and a dev-only
`forty-cdk-harness` app used by the Playwright E2E suite. The repo uses
[pnpm](https://pnpm.io/) (pinned via Corepack).

```bash
pnpm test        # unit tests (Vitest + jsdom), pinned to the library project
pnpm lint        # eslint (flat config)
pnpm build       # ng build forty-cdk (production, ng-packagr → dist/forty-cdk)
pnpm watch       # ng build forty-cdk --watch --configuration development
pnpm test:e2e    # playwright test (Chromium + WebKit; spins up the harness)
```

### Pre-commit hook

A [lefthook](https://github.com/evilmartians/lefthook) `pre-commit` hook runs lint
(`eslint`), auto-formats staged files (`prettier --write`, re-staging any fixes), and
a library typecheck (`pnpm typecheck:lib`, `tsc --noEmit`) on each commit. Lint and
format only inspect the **staged** files, so the hook stays fast; the typecheck runs
whenever staged TypeScript files exist, but is scoped to the library project — CI runs
the full `pnpm typecheck` (library plus the dev-only apps) on every PR.

The hook installs automatically — `pnpm install` runs the `prepare` script
(`lefthook install`). Bypass it for a one-off commit with `git commit --no-verify`.

## License

[MIT](LICENSE)
