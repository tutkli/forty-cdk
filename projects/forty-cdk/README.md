# forty-cdk

Headless / styleless UI primitives for Angular with WAI-ARIA accessibility built in.
Inspired by Radix UI and Base UI but reinterpreted idiomatically for modern Angular.

**New here?** [Your first overlay](../../docs/your-first-overlay.md) walks one Popover from empty markup to styled-and-animated and explains the two concepts every overlay shares: the `@if` / open-state model and the portal → global CSS requirement.

**Styling these primitives?** [Styling forty-cdk](../../docs/styling.md) explains the three hooks you style against — your own class (not the directive selector), `data-*` state attributes, and `--for-*` custom properties — and links to each primitive's styling reference.

## Installation

```bash
npm install forty-cdk
```

### Peer dependencies

Required:

- `@angular/common` `^21.2.0`
- `@angular/core` `^21.2.0`
- `@floating-ui/dom` `^1.6.0` — positioned overlays (`Tooltip`, `Popover`, `Menu`, `Combobox`, `Select`, etc.) import floating-ui statically. Because the library ships from a single entry point, every consumer's bundle resolves it regardless of which primitives they actually use; flagging it optional would silently break installs that skip it. If per-primitive secondary entry points are introduced later (currently deferred — see `CLAUDE.md`), this peer can become honestly optional for non-overlay consumers.

Optional — install only if you use the matching primitives:

| Peer                       | Needed by                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@angular/forms` `^21.2.0` | Form-control primitives (`Switch`, `Checkbox`, `RadioGroup`, `Listbox`, plus future `Select` / `Slider` / `Combobox`). They implement `FormValueControl` / `FormCheckboxControl` from `@angular/forms/signals` for `[formField]` auto-wiring. Consumers using only non-form primitives can skip it. |

`@angular/forms/signals` is `@experimental` in Angular 21, so we pin to the matching minor (`^21.2.0`) and revisit on each Angular bump.

## Primitives

Each primitive lives under [`src/lib/<primitive>/`](src/lib) with its own `README.md` and a minimal styleless usage example.

The library ships a single entry point (`forty-cdk`); standalone directives plus `"sideEffects": false` let tree-shakers drop primitives you don't import.

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
pnpm test                                       # all specs, single pass
pnpm exec ng test --watch                       # watch mode
pnpm exec ng test -- src/lib/accordion/accordion.spec.ts  # single file
pnpm exec ng test -- -t "opens on Enter"        # single test by name
```

Every primitive's test suite includes a case running under `provideZonelessChangeDetection()` to keep reactivity working without Zone.js.
