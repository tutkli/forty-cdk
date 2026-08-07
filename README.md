<div align="center">

# forty-cdk

**Headless, styleless UI primitives for modern Angular — accessibility built in.**

[![npm version](https://img.shields.io/npm/v/forty-cdk.svg)](https://www.npmjs.com/package/forty-cdk)
[![CI](https://github.com/tutkli/forty-cdk/actions/workflows/ci.yml/badge.svg)](https://github.com/tutkli/forty-cdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-22%2B-dd0031.svg)

[**Documentation**](https://tutkli.github.io/forty-cdk/) · accessible · zoneless · SSR-safe ·
tree-shakable

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

Requires `@angular/common` and `@angular/core` `^22.0.1`. Some primitives have optional peers
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
- **Date & time** — Calendar, Date Field, Date Picker, Time Field, Time Picker
- **Disclosure & content** — Accordion, Disclosure, Carousel
- **Data & layout** — Table, Tree, Scroll Area, Pane Resizer, Separator, Aspect Ratio, Avatar, Visually Hidden
- **Feedback** — Progress, Meter
- **Utilities** — Breakpoints, Drag & Drop, Virtualization, Table Virtualization, Virtual Reorder

## Documentation

- [**Documentation site**](https://tutkli.github.io/forty-cdk/) — every primitive with live,
  editable examples.
- [**Library README**](projects/forty-cdk/README.md) — installation, peer dependencies and the full
  primitive catalog.
- [**Your first overlay**](docs/your-first-overlay.md) — one Popover from empty markup to
  styled-and-animated, explaining the `@if` / open-state model and the portal → global CSS
  requirement every overlay shares.
- [**Styling forty-cdk**](docs/styling.md) — the three hooks you style against: your own class,
  `data-*` state attributes, and `--for-*` custom properties.
- [`docs/`](docs) — the remaining guides (styling floating content, the selection value-type
  contract, wrapping primitives in a design system, the Table layers).
- [CHANGELOG](CHANGELOG.md) — release notes.

## Development

This is an Angular CLI workspace with the `forty-cdk` library plus two dev-only apps:
`forty-cdk-harness` (drives the Playwright E2E suite) and `forty-cdk-playground` (the documentation
site). The repo uses [pnpm](https://pnpm.io/), pinned via Corepack.

```bash
pnpm build        # ng build forty-cdk (production, ng-packagr → dist/forty-cdk)
pnpm watch        # rebuild the library on change
pnpm test         # unit tests (Vitest + jsdom), pinned to the library project
pnpm test:e2e     # playwright test (Chromium + WebKit; spins up the harness)
pnpm lint         # eslint (flat config)
pnpm typecheck    # library + both apps
pnpm format       # prettier --write .
pnpm playground   # serve the documentation site locally
```

A [lefthook](https://github.com/evilmartians/lefthook) `pre-commit` hook lints and formats the
**staged** files and runs the library typecheck; it installs itself when `pnpm install` runs the
`prepare` script. Bypass it for a one-off commit with `git commit --no-verify`. CI additionally runs
`pnpm format:check`, the full `pnpm typecheck`, and the E2E suite sharded across both engines.

## License

[MIT](LICENSE)
