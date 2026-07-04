# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Designed from the ground up for modern Angular — the API is built around signals, standalone
directives, and dependency-injection composition.

**New here?** [Your first overlay](../../docs/your-first-overlay.md) walks one Popover from empty markup to styled-and-animated and explains the two concepts every overlay shares: the `@if` / open-state model and the portal → global CSS requirement.

**Styling these primitives?** [Styling forty-cdk](../../docs/styling.md) explains the three hooks you style against — your own class (not the directive selector), `data-*` state attributes, and `--for-*` custom properties — and links to each primitive's styling reference.

## Installation

```bash
npm install forty-cdk
```

### Peer dependencies

Required:

- `@angular/common` `^22.0.0`
- `@angular/core` `^22.0.0`

Optional — install only if you use the matching entry point / primitives:

| Peer                               | Needed by                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@angular/forms` `^22.0.0`         | Form-control primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox`, `Select`, `Slider`, `Combobox`, …). They implement `FormValueControl` / `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring. The contract is type-only, so the published bundle never references the package — consumers using only non-form primitives can skip it. |
| `@internationalized/date` `^3.0.0` | The `forty-cdk/internationalized-date` entry point (`InternationalizedDateAdapter`, `InternationalizedDateTimeAdapter`). The date/time primitives themselves only depend on the abstract `DateAdapter` contract from the main entry point — install this peer only when you import that entry point.                                                                       |

`@angular/forms/signals` is stable as of Angular 22, so the peer follows the standard major range (`^22.0.0`).

### Regular dependencies

`@floating-ui/dom` is a regular dependency, installed automatically with the package. Positioned overlays (`Tooltip`, `Popover`, `Menu`, `Combobox`, `Select`, etc.) import it statically from the main entry point, so every consumer's build must be able to resolve it — but it is internal-only (no floating-ui value crosses the public API) and tree-shakes out of your bundle when you don't use any positioned primitive.

## Primitives

Each primitive lives in its own folder under `projects/forty-cdk/` (e.g. [`accordion/`](accordion), [`dialog/`](dialog)) with its own `README.md` and a minimal styleless usage example.

Every primitive ships as its own **secondary entry point** — import `ForDialog` from `forty-cdk/dialog`, `ForAccordion` from `forty-cdk/accordion`, and so on — backed by the shared `forty-cdk/core` entry point. The `@internationalized/date` adapters live in a dedicated `forty-cdk/internationalized-date` entry point so that optional peer stays truly optional. The main `forty-cdk` barrel is **intentionally empty** (it exports no symbols): always import from the specific `forty-cdk/<primitive>` entry point. Standalone directives plus `"sideEffects": false` mean your bundle only ever includes the primitives you import.

## Directive → host element matrix

Quick reference for "which HTML element should I put this directive on?". Recommendations are derived from each primitive's WAI-ARIA pattern (e.g. focusable triggers as `<button type="button">`, the combobox input as a real `<input>` so caret/selection work) and from each primitive's README usage example. `any element` means the directive is element-agnostic — pick the tag that matches your semantics.

Selectors marked with `(element)` use an element selector instead of an attribute selector; everything else is `[attribute]`. Form-control hosts (`forSwitch`, `forCheckbox`, `forRadio`, `forToggle`) deliberately render as `<button type="button">` — the directive forces `type="button"` and provides `role="switch"` / `"checkbox"` / `"radio"` / `aria-pressed` so the consumer keeps full keyboard, focus, and form-state behaviour without an `<input>` whose chrome can't be styled.

### Accordion

| Selector                | Host                                           |
| ----------------------- | ---------------------------------------------- |
| `[forAccordion]`        | `<div>`                                        |
| `[forAccordionItem]`    | `<div>`                                        |
| `[forAccordionTrigger]` | `<button>` (wrapped in `<h2>`–`<h6>`, per APG) |
| `[forAccordionContent]` | `<section>`                                    |

### Aspect Ratio

| Selector           | Host    |
| ------------------ | ------- |
| `[forAspectRatio]` | `<div>` |

### Avatar

| Selector              | Host                           |
| --------------------- | ------------------------------ |
| `[forAvatar]`         | `<span>`                       |
| `img[forAvatarImage]` | `<img>` (selector enforces it) |
| `[forAvatarFallback]` | `<span>`                       |

### Checkbox

| Selector                 | Host                              |
| ------------------------ | --------------------------------- |
| `[forCheckbox]`          | `<button type="button">` (forced) |
| `[forCheckboxIndicator]` | `<span>`                          |

### Combobox

| Selector                  | Host                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| `[forCombobox]`           | `<div>`                                                             |
| `[forComboboxInput]`      | `<input>` (a real text field — `role="combobox"` + caret semantics) |
| `[forComboboxContent]`    | `<div>`                                                             |
| `[forComboboxOption]`     | `<div>`                                                             |
| `[forComboboxIndicator]`  | `<span>`                                                            |
| `[forComboboxEmpty]`      | `<div>`                                                             |
| `[forComboboxStatus]`     | `<div>`                                                             |
| `[forComboboxClear]`      | `<button>`                                                          |
| `[forComboboxChips]`      | `<div>`                                                             |
| `[forComboboxChip]`       | `<span>`                                                            |
| `[forComboboxChipRemove]` | `<button>`                                                          |
| `[forComboboxGroup]`      | `<div>`                                                             |
| `[forComboboxGroupLabel]` | `<div>`                                                             |
| `[forComboboxSeparator]`  | `<div>`                                                             |

### Context Menu

| Selector                                                     | Host             |
| ------------------------------------------------------------ | ---------------- |
| `[forContextMenu]`                                           | `<div>`          |
| `[forContextMenuTrigger]`                                    | any element      |
| Menu surface pieces (`[forMenuContent]`, `[forMenuItem]`, …) | see _Menu_ below |

### Dialog

| Selector                 | Host                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `[forDialog]`            | `<div>`                                                    |
| `[forDialogTrigger]`     | `<button>`                                                 |
| `[forDialogTitle]`       | `<h2>` (any heading level works; pick by document outline) |
| `[forDialogDescription]` | `<p>`                                                      |
| `[forDialogClose]`       | `<button>`                                                 |
| `[forDialogBackdrop]`    | `<div>`                                                    |

### Disclosure

| Selector                 | Host                     |
| ------------------------ | ------------------------ |
| `[forDisclosure]`        | `<div>`                  |
| `[forDisclosureTrigger]` | `<button>`               |
| `[forDisclosureContent]` | `<div>` (or `<section>`) |

### Dropdown Menu

| Selector                                                     | Host             |
| ------------------------------------------------------------ | ---------------- |
| `[forDropdownMenu]`                                          | `<div>`          |
| `[forDropdownMenuTrigger]`                                   | `<button>`       |
| Menu surface pieces (`[forMenuContent]`, `[forMenuItem]`, …) | see _Menu_ below |

### Hover Card

| Selector                | Host        |
| ----------------------- | ----------- |
| `[forHoverCard]`        | `<div>`     |
| `[forHoverCardTrigger]` | any element |
| `[forHoverCardContent]` | `<div>`     |
| `[forHoverCardArrow]`   | `<div>`     |

### Listbox

| Selector                      | Host     |
| ----------------------------- | -------- |
| `[forListbox]`                | `<div>`  |
| `[forListboxOption]`          | `<div>`  |
| `[forListboxOptionIndicator]` | `<span>` |
| `[forListboxGroup]`           | `<div>`  |
| `[forListboxGroupLabel]`      | `<div>`  |

### Menu

| Selector                   | Host     |
| -------------------------- | -------- |
| `[forMenu]`                | `<div>`  |
| `[forMenuContent]`         | `<div>`  |
| `[forMenuItem]`            | `<div>`  |
| `[forMenuItemIndicator]`   | `<span>` |
| `[forMenuCheckboxItem]`    | `<div>`  |
| `[forMenuRadioItem]`       | `<div>`  |
| `[forMenuRadioGroup]`      | `<div>`  |
| `[forMenuSeparator]`       | `<div>`  |
| `[forMenuGroup]`           | `<div>`  |
| `[forMenuGroupLabel]`      | `<div>`  |
| `[forMenuSub]`             | `<div>`  |
| `[forMenuSubTrigger]`      | `<div>`  |
| `[forMenuHorizontalArrow]` | `<span>` |

### Menubar

| Selector                                                     | Host             |
| ------------------------------------------------------------ | ---------------- |
| `[forMenubar]`                                               | `<div>`          |
| `[forMenubarTrigger]`                                        | `<button>`       |
| Menu surface pieces (`[forMenuContent]`, `[forMenuItem]`, …) | see _Menu_ above |

### Meter

| Selector              | Host    |
| --------------------- | ------- |
| `[forMeter]`          | `<div>` |
| `[forMeterIndicator]` | `<div>` |

### Navigation Menu

| Selector                       | Host                                     |
| ------------------------------ | ---------------------------------------- |
| `[forNavigationMenu]`          | `<nav>`                                  |
| `[forNavigationMenuList]`      | `<ul>` (or `<div>`)                      |
| `[forNavigationMenuItem]`      | `<li>` (or `<div>`, matching the list)   |
| `[forNavigationMenuTrigger]`   | `<button>`                               |
| `[forNavigationMenuLink]`      | `<a>` (or `<button>` for in-app actions) |
| `[forNavigationMenuContent]`   | `<div>`                                  |
| `[forNavigationMenuViewport]`  | `<div>`                                  |
| `[forNavigationMenuIndicator]` | `<div>`                                  |

### Pane Resizer

| Selector           | Host    |
| ------------------ | ------- |
| `[forPaneResizer]` | `<div>` |

### Popover

| Selector                  | Host                                  |
| ------------------------- | ------------------------------------- |
| `[forPopover]`            | `<div>`                               |
| `[forPopoverTrigger]`     | `<button>`                            |
| `[forPopoverContent]`     | `<div>`                               |
| `[forPopoverTitle]`       | `<h2>` (any heading; pick by outline) |
| `[forPopoverDescription]` | `<p>`                                 |
| `[forPopoverClose]`       | `<button>`                            |
| `[forPopoverArrow]`       | `<div>`                               |
| `[forPopoverAnchor]`      | any element                           |

### Progress

| Selector                 | Host    |
| ------------------------ | ------- |
| `[forProgress]`          | `<div>` |
| `[forProgressIndicator]` | `<div>` |

### Radio Group

| Selector          | Host                              |
| ----------------- | --------------------------------- |
| `[forRadioGroup]` | `<div>`                           |
| `[forRadio]`      | `<button type="button">` (forced) |

### Scroll Area

| Selector                   | Host    |
| -------------------------- | ------- |
| `[forScrollArea]`          | `<div>` |
| `[forScrollAreaViewport]`  | `<div>` |
| `[forScrollAreaContent]`   | `<div>` |
| `[forScrollAreaScrollbar]` | `<div>` |
| `[forScrollAreaThumb]`     | `<div>` |
| `[forScrollAreaCorner]`    | `<div>` |

### Select

| Selector                | Host       |
| ----------------------- | ---------- |
| `[forSelect]`           | `<div>`    |
| `[forSelectTrigger]`    | `<button>` |
| `[forSelectValue]`      | `<span>`   |
| `[forSelectContent]`    | `<div>`    |
| `[forSelectOption]`     | `<div>`    |
| `[forSelectIndicator]`  | `<span>`   |
| `[forSelectGroup]`      | `<div>`    |
| `[forSelectGroupLabel]` | `<div>`    |
| `[forSelectSeparator]`  | `<div>`    |

### Separator

| Selector         | Host                                                |
| ---------------- | --------------------------------------------------- |
| `[forSeparator]` | `<div>` (or `<hr>` for the static, decorative case) |

### Slider

| Selector           | Host    |
| ------------------ | ------- |
| `[forSlider]`      | `<div>` |
| `[forSliderTrack]` | `<div>` |
| `[forSliderRange]` | `<div>` |
| `[forSliderThumb]` | `<div>` |

### Switch

| Selector      | Host                              |
| ------------- | --------------------------------- |
| `[forSwitch]` | `<button type="button">` (forced) |

### Tabs

| Selector           | Host       |
| ------------------ | ---------- |
| `[forTabs]`        | `<div>`    |
| `[forTabsList]`    | `<div>`    |
| `[forTabsTrigger]` | `<button>` |
| `[forTabsContent]` | `<div>`    |

### Toast

| Selector                                               | Host       |
| ------------------------------------------------------ | ---------- |
| `for-toast-viewport` (element) or `[forToastViewport]` | `<div>`    |
| `[forToast]`                                           | `<div>`    |
| `[forToastTitle]`                                      | `<div>`    |
| `[forToastDescription]`                                | `<div>`    |
| `[forToastAction]`                                     | `<button>` |
| `[forToastClose]`                                      | `<button>` |

### Toggle

| Selector               | Host                              |
| ---------------------- | --------------------------------- |
| `[forToggle]`          | `<button type="button">` (forced) |
| `[forToggleGroup]`     | `<div>`                           |
| `[forToggleGroupItem]` | `<button type="button">` (forced) |

### Toolbar

| Selector                | Host       |
| ----------------------- | ---------- |
| `[forToolbar]`          | `<div>`    |
| `[forToolbarButton]`    | `<button>` |
| `[forToolbarLink]`      | `<a>`      |
| `[forToolbarSeparator]` | `<div>`    |

### Tooltip

| Selector              | Host        |
| --------------------- | ----------- |
| `[forTooltip]`        | `<div>`     |
| `[forTooltipTrigger]` | any element |
| `[forTooltipContent]` | `<div>`     |
| `[forTooltipArrow]`   | `<div>`     |

## Building

```bash
ng build forty-cdk
```

Build artifacts land in `dist/forty-cdk` (consumed locally via the `forty-cdk` path alias in the root `tsconfig.json`).

## Testing

Tests run on Vitest via the Angular CLI builder `@angular/build:unit-test`:

```bash
pnpm test                                              # all specs, single pass
pnpm exec ng test forty-cdk --watch                    # watch mode
pnpm exec ng test forty-cdk --include "../accordion/src/accordion.spec.ts"  # single file (path relative to projects/forty-cdk/src/)
pnpm exec ng test forty-cdk --filter "Enter and Space select"  # tests by name (regex)
```

The `-- <path>` / `-- -t "<name>"` passthrough forms do **not** work on this setup (pnpm mangles the quoted `--`, so `ng` rejects it) — use the builder's own `--include` (repeatable) and `--filter` (regex) flags instead.

Every primitive's test suite includes a case running under `provideZonelessChangeDetection()` to keep reactivity working without Zone.js.
