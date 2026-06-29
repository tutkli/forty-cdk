# ForStepper

A headless, accessible multi-step wizard primitive. Implements the
[WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) in
`mode="interactive"` (full roving tabindex, `role="tablist"`) and a progress
list with `aria-current="step"` in `mode="progress"`.

See [Styling forty-cdk](../../../../../docs/styling.md) for theming guidance.

---

## Anatomy

| Directive                    | Selector                       | Role (interactive / progress)           |
| ---------------------------- | ------------------------------ | --------------------------------------- |
| `ForStepper`                 | `[forStepper]`                 | root                                    |
| `ForStepperList`             | `[forStepperList]`             | `tablist` / `list`                      |
| `ForStepperItem`             | `[forStepperItem]`             | item container (wraps trigger + panel)  |
| `ForStepperTrigger`          | `[forStepperTrigger]`          | `tab` / static (aria-current)           |
| `ForStepperIndicator`        | `[forStepperIndicator]`        | decorative icon (`aria-hidden`)         |
| `ForStepperSeparator`        | `[forStepperSeparator]`        | decorative connector (`aria-hidden`)    |
| `ForStepperContent`          | `[forStepperContent]`          | `tabpanel` / `group`                    |
| `ForStepperNext`             | `button[forStepperNext]`       | next-step button                        |
| `ForStepperPrevious`         | `button[forStepperPrevious]`   | previous-step button                    |
| `ForStepperProgress`         | `[forStepperProgress]`         | `progressbar` (optional)                |
| `ForStepperCompletedContent` | `[forStepperCompletedContent]` | `group` (terminal "all complete" panel) |

---

## Examples

### Interactive mode with linear progression

```html
<div forStepper [(selectedIndex)]="step" [linear]="true">
  <ol forStepperList ariaLabel="Checkout">
    <li forStepperItem [completed]="step > 0">
      <button forStepperTrigger>
        <span forStepperIndicator></span>
        Shipping
      </button>
      <span forStepperSeparator></span>
    </li>
    <li forStepperItem [completed]="step > 1">
      <button forStepperTrigger>
        <span forStepperIndicator></span>
        Payment
      </button>
      <span forStepperSeparator></span>
    </li>
    <li forStepperItem>
      <button forStepperTrigger>
        <span forStepperIndicator></span>
        Review
      </button>
    </li>
  </ol>

  <section forStepperContent>Shipping form</section>
  <section forStepperContent>Payment form</section>
  <section forStepperContent>Order review</section>

  <button forStepperPrevious>Back</button>
  <button forStepperNext>Next</button>
</div>
```

### Completed-all content

```html
<div forStepper [(selectedIndex)]="step" (complete)="onDone()">
  <!-- … list / content … -->
  @if (step() >= steps.length) {
  <section forStepperCompletedContent>All steps complete 🎉</section>
  }
</div>
```

When `Next` is pressed on the last step, `selectedIndex` advances to `count` (one past the last step) and `(complete)` fires once. `[forStepperPrevious]` returns to the last step. While completed, every `[forStepperContent]` panel is inactive and only `[forStepperCompletedContent]` carries `data-state="active"` (the others reflect `inert` + `aria-hidden`).

### Signal Forms field-driven completion

Bind a step to a [Signal Forms](https://angular.dev/) field and its completion and
error state follow the field's validity automatically — no manual `[completed]`
wiring. A step is `completed` when its field is **valid and touched**; it reflects
`error` when the field is **touched and invalid**. A manual `[completed]` /
`[hasError]` input always wins when set.

```ts
import { Component, signal } from '@angular/core';
import { form, required, email } from '@angular/forms/signals';
import {
  ForStepper,
  ForStepperContent,
  ForStepperItem,
  ForStepperList,
  ForStepperTrigger,
} from 'forty-cdk/stepper';

@Component({
  imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
  template: `
    <div forStepper [(selectedIndex)]="step" [linear]="true">
      <ol forStepperList ariaLabel="Sign up">
        <li forStepperItem [field]="signup.account">
          <button forStepperTrigger>Account</button>
        </li>
        <li forStepperItem [field]="signup.profile">
          <button forStepperTrigger>Profile</button>
        </li>
      </ol>
      <section forStepperContent>…</section>
      <section forStepperContent>…</section>
    </div>
  `,
})
export class SignupWizard {
  protected readonly step = signal(0);
  private readonly model = signal({ account: '', profile: '' });
  protected readonly signup = form(this.model, (s) => {
    required(s.account);
    email(s.account);
    required(s.profile);
  });
}
```

### Progress mode (display-only)

```html
<div forStepper [selectedIndex]="currentStep" mode="progress">
  <ol forStepperList ariaLabel="Order status">
    <li forStepperItem [completed]="currentStep > 0">
      <span forStepperTrigger>Processing</span>
      <span forStepperSeparator></span>
    </li>
    <li forStepperItem [completed]="currentStep > 1">
      <span forStepperTrigger>Shipped</span>
      <span forStepperSeparator></span>
    </li>
    <li forStepperItem>
      <span forStepperTrigger>Delivered</span>
    </li>
  </ol>
</div>
```

### Progress bar (`ForStepperProgress`)

An optional `role="progressbar"` reflecting how far through the steps the user is. Reports
`aria-valuenow` (0–100) + `aria-valuetext`, and publishes a `--for-stepper-progress` (0–1)
custom property for a styleable fill. `valueBy="index"` (default) tracks the current step
index; `valueBy="completed"` tracks the count of completed steps.

```html
<div forStepper [(selectedIndex)]="step">
  <div forStepperProgress ariaLabel="Checkout progress"></div>
  <!-- … list / content … -->
</div>
```

```css
[forStepperProgress]::after {
  content: '';
  display: block;
  width: calc(var(--for-stepper-progress) * 100%);
}
```

### Custom icon per state (indicator example)

```html
<li forStepperItem #step="forStepperItem">
  <button forStepperTrigger>
    <span forStepperIndicator>
      @if (step.resolvedState() === 'completed') {
      <svg><!-- checkmark --></svg>
      } @else if (step.resolvedState() === 'error') {
      <svg><!-- exclamation --></svg>
      } @else { {{ step.index() + 1 }} }
    </span>
    Step label
  </button>
</li>
```

Or purely via CSS:

```css
[forStepperIndicator][data-state='completed']::before {
  content: '✓';
}
[forStepperIndicator][data-state='error']::before {
  content: '!';
}
[forStepperIndicator][data-state='active']::before {
  content: '●';
}
[forStepperIndicator][data-state='pending']::before {
  content: '○';
}
```

---

## API

### `ForStepper`

| Property         | Type                              | Description                                                                                                                    |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `selectedIndex`  | `model<number>`                   | Two-way bindable selected step index, range `0 … count` (the terminal `=== count` is the completed state).<br>**Default:** `0` |
| `linear`         | `input<boolean>`                  | Gate forward navigation until preceding steps complete.<br>**Default:** `false`                                                |
| `mode`           | `input<StepperMode>`              | Accessibility model.<br>**Default:** `'interactive'`                                                                           |
| `orientation`    | `input<'horizontal'\|'vertical'>` | Layout axis; affects arrow-key semantics.<br>**Default:** `'horizontal'`                                                       |
| `activationMode` | `input<StepperActivationMode>`    | Whether arrow nav also selects (scope-injectable).<br>**Default:** `'manual'`                                                  |
| `loop`           | `input<boolean>`                  | Wrap arrow navigation (scope-injectable).<br>**Default:** `true`                                                               |
| `disabled`       | `input<boolean>`                  | Disables all triggers and navigation.<br>**Default:** `false`                                                                  |
| `dir`            | `input<'ltr'\|'rtl'\|null>`       | Writing direction (inherits ambient when unset).<br>**Default:** `null`                                                        |
| `complete`       | `output()`                        | Output. Fires once each time the stepper enters the completed state.<br>**Default:** —                                         |

`ForStepper` exposes two members for the terminal completed state:

- **`isCompleted`** (`Signal<boolean>`) — true when `selectedIndex()` has reached `count()` (one past the last step). Read it via a `#stepper="forStepper"` template reference.
- **`(complete)`** — output that fires once each time the stepper enters the completed state. Retreating via `[forStepperPrevious]` and re-entering emits again.

### `ForStepperItem`

| Property    | Type                              | Description                                                                                          |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `completed` | `input<boolean>`                  | Marks the step done (manual; wins over `field`).<br>**Default:** `false`                             |
| `optional`  | `input<boolean>`                  | Marks the step skippable in linear mode.<br>**Default:** `false`                                     |
| `disabled`  | `input<boolean>`                  | Disables only this step.<br>**Default:** `false`                                                     |
| `hasError`  | `input<boolean>`                  | Emits `'error'` resolved state when not current (manual; wins over `field`).<br>**Default:** `false` |
| `field`     | `input<FieldTree<unknown>\|null>` | Optional Signal Forms field; drives `completed`/`hasError` from validity.<br>**Default:** `null`     |
| `state`     | `input<string\|null>`             | Custom state override — wins over derived state.<br>**Default:** `null`                              |

### Data attributes

#### `data-state` vocabulary

| Piece                          | Values                                            |
| ------------------------------ | ------------------------------------------------- |
| `[forStepperItem]`             | `pending` `active` `completed` `error` `<custom>` |
| `[forStepperTrigger]`          | same as item                                      |
| `[forStepperIndicator]`        | same as item                                      |
| `[forStepperContent]`          | `active` `inactive`                               |
| `[forStepperCompletedContent]` | `active` `inactive`                               |
| `[forStepperSeparator]`        | `completed` `pending`                             |

#### Boolean `data-*`

| Attribute          | When present                                     |
| ------------------ | ------------------------------------------------ |
| `data-disabled`    | Root or step is disabled                         |
| `data-orientation` | Always — `horizontal` or `vertical`              |
| `data-mode`        | Always (root only) — `interactive` or `progress` |

---

## Keyboard

| Key                        | Action                                    |
| -------------------------- | ----------------------------------------- |
| `ArrowRight` / `ArrowDown` | Move focus to next selectable trigger     |
| `ArrowLeft` / `ArrowUp`    | Move focus to previous selectable trigger |
| `Home`                     | Move focus to first selectable trigger    |
| `End`                      | Move focus to last selectable trigger     |
| `Space` / `Enter`          | Activate focused trigger (manual mode)    |
| `Tab`                      | Move focus into / out of the step panel   |

In `activationMode="automatic"` arrow keys move focus AND select. In `activationMode="manual"` (default) only Space / Enter activate.

In `orientation="vertical"` ArrowUp/Down navigate; ArrowLeft/Right are ignored. In `orientation="horizontal"` ArrowLeft/Right navigate; ArrowUp/Down are ignored. RTL inverts ArrowLeft and ArrowRight.

## Accessibility

- **Interactive mode** implements the WAI-ARIA Tabs pattern. Each trigger carries `role="tab"`, the list carries `role="tablist"`, and content panels carry `role="tabpanel"`. `aria-selected` is always emitted; `aria-controls` is gated to the current step (prevents dangling references when panels are unmounted with `@if`).
- **Progress mode** uses a standard `<ol role="list">` with `aria-current="step"` on the active trigger. No tab-stop manipulation is performed; triggers carry no `role`.
- **Disabled triggers** in interactive mode retain their tab stop using `aria-disabled="true"` rather than the native `disabled` attribute, so assistive technology can announce them.
- **Linear mode** reflects unreachable ahead-steps as `aria-disabled="true"` + `data-disabled=""` on the trigger. Keyboard navigation skips them automatically.
- **RTL** is supported: set `dir="rtl"` on the root or a DOM ancestor.
- **Progress bar** (`[forStepperProgress]`) is an opt-in part. When present it exposes `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-valuenow` derived from the current step or the count of completed steps.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the `data-state` vocabulary and boolean `data-*` attributes listed under [Data attributes](#data-attributes).
