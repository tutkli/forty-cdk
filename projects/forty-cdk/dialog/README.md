# Dialog

A modal window overlaid on the page, with a focus trap, scroll lock and Escape / dismiss handling. Also openable imperatively through ForDialogManager.

> New to overlays in forty-cdk? [Your first overlay](../../../../../docs/your-first-overlay.md) walks a Popover from empty markup to styled-and-animated and explains the `@if` / open-state model and the portal → global CSS rule.

## Two flows, one engine

The same focus trap, scroll lock, portal, and dismissable-layer behaviors run under both APIs. Pick the one that fits the call site.

### Declarative — `[forDialog]`

The dialog is an overlay: **mount equals open**. The consumer's signal drives `@if`, and the directive emits `(dismiss)` when it wants to be unmounted (Escape, backdrop, outside-pointer, outside-focus, close button). There is no `[(open)]` two-way binding on `[forDialog]` — the directive never opens itself, only requests close.

For the open side, drop `[forDialogTrigger]` on a `<button>`. It two-way binds `[(open)]` to the same signal that gates the surrounding `@if`, and wires `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and `data-state` automatically.

```ts
import { Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk/dialog';

@Component({
  selector: 'demo-confirm',
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ForDialogBackdrop,
  ],
  template: `
    <button forDialogTrigger [(open)]="open" controls="confirm-delete">Delete account</button>

    @if (open()) {
      <div forDialog id="confirm-delete" (dismiss)="open.set(false)" animate.leave="fade-out">
        <div forDialogBackdrop class="my-backdrop" animate.leave="fade-out"></div>
        <h2 forDialogTitle>Delete account?</h2>
        <p forDialogDescription>This permanently removes your data.</p>
        <button forDialogClose>Cancel</button>
        <button (click)="confirm()">Delete</button>
      </div>
    }
  `,
})
export class DemoConfirm {
  readonly open = signal(false);
  confirm() {
    /* ... */ this.open.set(false);
  }
}
```

Wrapping with `@if` is what makes Angular's native `animate.enter` / `animate.leave` work — they fire on real mount / unmount, not on attribute toggling.

### The `(dismiss)` contract — consumer owns unmount

`(dismiss)` reports the dialog's **intent** to be unmounted; it does not flip the consumer's signal. The consumer must call `open.set(false)` (or equivalent) inside the handler. If the handler is omitted or does not update the signal, Escape, backdrop-click, and outside-pointer-down all emit `(dismiss)` but the dialog stays mounted.

```html
<!-- correct: (dismiss) drives the @if gate -->
<div forDialog id="my-dialog" (dismiss)="open.set(false)">…</div>

<!-- broken: `(dismiss)` is missing — Escape fires but the dialog never unmounts -->
<div forDialog id="my-dialog">…</div>
```

This is different from trigger-anchored overlays (Popover, DropdownMenu, etc.) where the wrapper directive owns `[(open)]` and round-trips it automatically on close. Dialog is **flat**: there is no wrapper, so the consumer's `@if` is the sole lifecycle gate.

The payload is a `ForDialogCloseReason` string (`'escape'`, `'backdrop'`, `'pointerDownOutside'`, `'focusOutside'`, `'closeButton'`, `'programmatic'`) — use it if you need to branch on why the dialog closed, for example to show a "save changes?" prompt before dismissing. Emitting `(dismiss)` without acting on it is always safe: you can call `preventDefault()` on the preceding dismiss outputs (`(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)`) to suppress the `(dismiss)` entirely.

> **Declarative vs. imperative naming asymmetry.** The declarative output is `(dismiss)`, but the imperative handle method stays `ForDialogRef.close()`, the `[forDialogClose]` directive selector is unchanged, and the `ForDialogCloseReason` type keeps its name. This is intentional: the output rename removes the native-event collision (see [#814](https://github.com/tutkli/forty-cdk/issues/814)) while the imperative surface follows the convention established before that rename.

### Trigger / surface id wiring

The trigger (`[forDialogTrigger]`) and the dialog surface (`[forDialog]`) are **separate, unrelated elements**. They wire to each other via a shared id that the consumer keeps in sync:

```html
<!-- trigger: controls="<id>" tells it which dialog it opens -->
<button forDialogTrigger [(open)]="open" controls="my-dialog">Open</button>

<!-- surface: id="<id>" must match controls above -->
@if (open()) {
<div forDialog id="my-dialog" (dismiss)="open.set(false)">…</div>
}
```

`[forDialogTrigger]` always reflects `aria-haspopup="dialog"` and `aria-expanded` (`"true"` / `"false"`, from the trigger's own `open` state) — these do not depend on `controls`. The `controls` value is what gets reflected as `aria-controls="my-dialog"`, and only while the dialog is open; omit `controls` and the trigger never gets an `aria-controls`, silently breaking assistive technology that announces "opens dialog X".

> **Popover is different.** `[forPopover]` wraps both the trigger and content in a single parent directive, so ids are auto-generated and kept in sync internally. Dialog is flat — trigger and surface can live anywhere in the template — so the wiring is manual.

### Programmatic — `ForDialogManager.open()`

```ts
import { Component, inject } from '@angular/core';
import { ForDialogManager, ForDialogRef, injectDialogData } from 'forty-cdk/dialog';

@Component({
  template: `
    <p>{{ data?.message }}</p>
    <button (click)="ref.close('cancel')">Cancel</button>
    <button (click)="ref.close('confirm')">Confirm</button>
  `,
})
class ConfirmDialog {
  readonly data = injectDialogData<{ message: string }>();
  readonly ref = inject(ForDialogRef) as ForDialogRef<'confirm' | 'cancel'>;
}

@Component({
  selector: 'demo-host',
  template: `<button (click)="askToDelete()">Delete</button>`,
})
export class DemoHost {
  readonly dialogs = inject(ForDialogManager);

  async askToDelete() {
    const ref = this.dialogs.open<ConfirmDialog, 'confirm' | 'cancel', { message: string }>(
      ConfirmDialog,
      { data: { message: 'Are you sure?' } },
    );
    const { result } = await ref.closed; // result: 'confirm' | 'cancel' | undefined
    if (result === 'confirm') {
      /* ... */
    }
  }
}
```

`injectDialogData<T>()` is typed `T | null`: the manager provides `null` when `open()` is called without `data`, so guard (`data?.message`) before dereferencing the payload.

**Styling the programmatic overlay root.** Declaratively you write the surface yourself (`<div forDialog class="my-dialog">`), so the class lands on the same element that carries `data-state` / `role`. The manager creates that host for you and it is class-less, so pass `class` / `classList` to style it.

```ts
this.dialogs.open(ConfirmDialog, { data, alert: true, class: 'my-dialog my-dialog--pop' });
```

The tokens go on the real `[forDialog]` host alongside `data-state` / `role` / `aria-modal`, merged and de-duped, never clobbering those attributes.

**Enter / exit animations.** A programmatic dialog is portaled to `document.body` and torn down imperatively, so the consumer can't attach `animate.leave` to the host the way a declarative `@if` block can. Pass `animateEnter` / `animateLeave` (CSS class names) instead: the manager applies `animateEnter` on mount (via `animate.enter`) and, on `close()`, keeps the host mounted with `animateLeave` until its CSS animations / transitions finish before tearing down. `close()` still resolves its promise and flips `isClosed()` immediately — only the visual teardown waits. With no class (or under `prefers-reduced-motion`, if your CSS disables the animation) close is immediate.

```ts
this.dialogs.open(ConfirmDialog, {
  data,
  class: 'my-dialog',
  animateEnter: 'dialog-in',
  animateLeave: 'dialog-out',
});
```

```css
.my-dialog {
  opacity: 1;
  transition: opacity 150ms ease-out;
}
.dialog-in {
  animation: dialog-fade-in 150ms ease-out;
}
.my-dialog.dialog-out {
  opacity: 0;
}
@keyframes dialog-fade-in {
  from {
    opacity: 0;
  }
}
```

Set them once for a scope with `provideForDialogDefaults({ animateEnter, animateLeave })`; a per-`open()` value always wins over the scope default.

## Anatomy

```html
<button forDialogTrigger [(open)]="open" controls="my-dialog">Open</button>

<!-- rendered only while open() is true, so animate.enter / animate.leave fire on real mount -->
<div forDialog id="my-dialog" (dismiss)="open.set(false)" animate.leave="fade-out">
  <div forDialogBackdrop class="my-backdrop"></div>
  <h2 forDialogTitle>Delete account?</h2>
  <p forDialogDescription>This action is permanent.</p>
  <button forDialogClose>Cancel</button>
  <button (click)="confirm()">Delete</button>
</div>
```

## API

### `ForDialog`

`(dismiss)` is the main signal — wire it to flip the `@if` gate. The four dismiss outputs are vetoable: each receives a `VetoableNativeEvent<E>` carrying the underlying DOM event. Call `preventDefault()` on the emitted veto to suppress the directive's default action; the original DOM event is on `.event`.

| Property             | Type                                                                | Description                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dismissible`        | —                                                                   | When `false`, Escape, backdrop, outside-pointer, and outside-focus do not request close. The close button still does.<br>**Default:** `true`                            |
| `modal`              | —                                                                   | When `false`, no `aria-modal`, no scroll lock, no focus trap.<br>**Default:** `true`                                                                                    |
| `alert`              | —                                                                   | Switches role to `alertdialog`.<br>**Default:** `false`                                                                                                                 |
| `returnFocus`        | —                                                                   | Focus returns to the previously focused element on close.<br>**Default:** `true`                                                                                        |
| `initialFocus`       | —                                                                   | `'first'` (first focusable inside) or `'container'` (the dialog host).<br>**Default:** `'first'`                                                                        |
| `ariaLabel`          | —                                                                   | Manual `aria-label` if no `[forDialogTitle]` is rendered.<br>**Default:** `null`                                                                                        |
| `close`              | `OutputEmitterRef<ForDialogCloseReason>`                            | Output. Dialog wants to be unmounted. Reasons: `'escape'`, `'backdrop'`, `'pointerDownOutside'`, `'focusOutside'`, `'closeButton'`, `'programmatic'`.<br>**Default:** — |
| `escapeKeyDown`      | `OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>`              | Output. Escape while this dialog is the topmost dismissable layer.<br>**Default:** —                                                                                    |
| `pointerDownOutside` | `OutputEmitterRef<VetoableNativeEvent<PointerEvent>>`               | Output. Pointer-down outside the dialog.<br>**Default:** —                                                                                                              |
| `focusOutside`       | `OutputEmitterRef<VetoableNativeEvent<FocusEvent>>`                 | Output. Focus moves outside the dialog.<br>**Default:** —                                                                                                               |
| `interactOutside`    | `OutputEmitterRef<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite: fires alongside both of the above (and shares their veto state).<br>**Default:** —                                                                   |

| Data attribute | Values                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| `data-state`   | `open` (always — the host is only mounted while open, so it is never `closed`) |

### Per-channel dismissal (Escape-only dialogs)

`dismissible` is **not** all-or-nothing. The four dismiss channels — Escape, pointer-down-outside, focus-outside, and the composite outside-interaction — are independently vetoable, so you can keep some live and suppress others. The canonical case is a **floater** (an update banner, a devtools panel) that should close on Escape but stay put when the user clicks elsewhere. Floaters are usually non-modal (`[modal]="false"`), so the rest of the page stays interactive.

**Declarative** — veto the outside channel, leave Escape alone:

```html
@if (open()) {
<div
  forDialog
  [modal]="false"
  (interactOutside)="$event.preventDefault()"
  (dismiss)="open.set(false)"
>
  …
</div>
}
```

`(interactOutside)` fires for both pointer-down-outside and focus-outside and shares their veto, so one handler covers every outside interaction. Escape keeps closing because its channel was never vetoed — to suppress Escape instead, veto `(escapeKeyDown)`.

**Programmatic** — the same four channels are callbacks on the open config, mirroring the `autoFocusOn*` shape:

```ts
this.dialogs.open(FloaterComponent, {
  modal: false,
  // dismissible: true is the default — Escape stays live.
  interactOutside: (event) => event.preventDefault(), // ignore outside interaction
  // escapeKeyDown / pointerDownOutside / focusOutside are available too.
});
```

Keep `dismissible: true` (the default) so Escape still closes, and veto only the channels you want to keep open. `event.event` carries the originating DOM event for inspection.

### Inputs — focus callbacks

The auto-focus pair is bound as **function references** (input callbacks), not as event listeners. Each callback receives a `VetoableEvent` whose `preventDefault()` suppresses the directive's default focus action. This shape mirrors `ForDialogManager`'s `config.autoFocusOn*` callbacks and guarantees the `autoFocusOnClose` callback fires reliably on every close path — including a direct `open.set(false)` that bypasses the `(dismiss)` output. See [CLAUDE.md › Auto-focus hook shape](../../../../../CLAUDE.md#auto-focus-hook-shape) for why Dialog uses callback-shape inputs while trigger-anchored overlays (Popover, DropdownMenu, ContextMenu, Menu sub, Select) use output-shape.

| Property           | Type                             | Description                                                                                                                                                                                                                                                          |
| ------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoFocusOnOpen`  | `(event: VetoableEvent) => void` | Just before focus moves into the dialog on mount. Call `event.preventDefault()` to skip the imperative initial focus.<br>**Default:** —                                                                                                                              |
| `autoFocusOnClose` | `(event: VetoableEvent) => void` | Just before focus returns to the trigger on unmount. Fires on every close path regardless of mode; in non-modal mode the directive doesn't move focus, so the veto is informational. Call `event.preventDefault()` to skip the modal return-focus.<br>**Default:** — |

### Open without stealing focus

```html
<input #q type="search" placeholder="Search…" />

@if (open()) {
<div forDialog (dismiss)="open.set(false)" [autoFocusOnOpen]="keepSearchFocused">
  <h2 forDialogTitle>Results</h2>
  …
</div>
}
```

```ts
readonly keepSearchFocused = (event: VetoableEvent): void => {
  event.preventDefault();
  this.q().nativeElement.focus();
};
```

The dialog still installs the focus trap (so Tab cycles inside once focus enters), but the imperative initial focus move is suppressed and the search input keeps focus.

### `ForDialogTrigger`

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present / absent   |

### `ForDialogBackdrop`

| Data attribute             | Values                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `data-state`               | `open` (always — mounted alongside the dialog)                                           |
| `data-for-dialog-backdrop` | present (stable marker; portaled alongside the dialog, so use it to select the backdrop) |

### `ForDialogClose`

| Data attribute | Values                                         |
| -------------- | ---------------------------------------------- |
| `data-state`   | `open` (always — mounted alongside the dialog) |

`[forDialog]`, `[forDialogBackdrop]`, and `[forDialogClose]` carry a static `data-state="open"`: because mount equals open (the host only exists inside `@if (open())`), the element is present iff the dialog is open, so the attribute can never be `closed`. Exit styling is the consumer's `animate.leave`, not a `[data-state="closed"]` selector. Only `[forDialogTrigger]`, which stays mounted, toggles `open` / `closed`.

## Programmatic API

| Symbol                  | Description                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForDialogManager`      | Injectable. `open(component, config?)` returns a `ForDialogRef<R>`.                                                                                           |
| `ForDialogRef<R>`       | `close(result?)`, `closed: Promise<{ reason: ForDialogCloseReason; result: R \| undefined }>`, `result: Signal<R \| undefined>`, `isClosed: Signal<boolean>`. |
| `FOR_DIALOG_DATA`       | Token for the `data` payload. Inject in the opened component.                                                                                                 |
| `injectDialogData<T>()` | Typed accessor for `FOR_DIALOG_DATA`. Returns `T \| null` — `null` when `open()` got no `data`.                                                               |

### `ForDialogOpenConfig`

| Field                | Default   | Description                                                                                              |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `data`               | —         | Payload available as `injectDialogData<T>()`.                                                            |
| `dismissible`        | `true`    | Escape closes when `true`.                                                                               |
| `modal`              | `true`    | Sets `aria-modal`, locks body scroll, traps focus.                                                       |
| `alert`              | `false`   | Use `role="alertdialog"` instead of `"dialog"`.                                                          |
| `returnFocus`        | `true`    | Focus returns to the previously focused element on close.                                                |
| `initialFocus`       | `'first'` | `'first'` finds first focusable; `'container'` focuses the host.                                         |
| `ariaLabel`          | —         | Manual accessible name when no title element is rendered.                                                |
| `animateEnter`       | —         | CSS class applied on mount (via `animate.enter`) to play an enter animation.                             |
| `animateLeave`       | —         | CSS class applied on close; the host stays mounted until its animation finishes, then tears down.        |
| `class`              | —         | CSS class(es) applied to the overlay root (the `[forDialog]` host). Single or space-separated string.    |
| `classList`          | —         | CSS class(es) applied to the overlay root, as an array or space-separated string. Merged with `class`.   |
| `providers`          | `[]`      | Extra providers for the opened component's injector.                                                     |
| `autoFocusOnOpen`    | —         | Callback. Receives a `VetoableEvent`; `event.preventDefault()` skips the imperative initial focus move.  |
| `autoFocusOnClose`   | —         | Callback. Receives a `VetoableEvent`; `event.preventDefault()` skips the return-focus on close.          |
| `escapeKeyDown`      | —         | Callback. `VetoableNativeEvent<KeyboardEvent>`; `preventDefault()` suppresses the Escape close.          |
| `pointerDownOutside` | —         | Callback. `VetoableNativeEvent<PointerEvent>`; `preventDefault()` suppresses the outside-pointer close.  |
| `focusOutside`       | —         | Callback. `VetoableNativeEvent<FocusEvent>`; `preventDefault()` suppresses the outside-focus close.      |
| `interactOutside`    | —         | Callback. Composite `VetoableNativeEvent<PointerEvent \| FocusEvent>`; shares the veto of the two above. |

The four dismiss callbacks mirror the declarative `(escapeKeyDown)` / `(pointerDownOutside)` / `(focusOutside)` / `(interactOutside)` outputs exactly — same events, same veto semantics. See [Per-channel dismissal](#per-channel-dismissal-escape-only-dialogs).

## Keyboard

- **Escape** requests close (reason `'escape'`) when `dismissible`.
- **Tab / Shift+Tab** cycles focus inside the dialog (focus trap, only when `modal`).
- **Click** on `[forDialogBackdrop]` requests close (reason `'backdrop'`) when `dismissible`.

## Accessibility

Implements the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

- Always provide an accessible name: render a `[forDialogTitle]` (sets `aria-labelledby`) or pass `ariaLabel`.
- `[forDialogDescription]` is optional — use it for non-title supporting copy (the question of a confirm, the rationale of an alert).
- `alert: true` interrupts assistive tech aggressively — only for genuine alerts (lost connection, unsaved changes warning), not for general confirms.
- Don't put interactive overlays (popovers, menus) outside the focus trap while a modal dialog is open — they won't be reachable. For a non-modal floating surface anchored to a trigger, use `[forPopover]` instead.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

> **This dialog portals to `document.body`.** CSS scoped to ancestors of `[forDialog]` (or `[forDialogBackdrop]`) will not apply once the surface is moved to the body. Style it with **global CSS** or a class. Declaratively you write the surface yourself, so add the class directly (`<div forDialog class="my-dialog">`); for programmatically opened instances pass `class` / `classList` on the `ForDialogManager.open()` config — they land on the same `[forDialog]` host that carries `data-state` / `role` / `aria-modal`, merged and never clobbering them.

```css
.my-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
}

.my-backdrop[data-for-dialog-backdrop] {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
}

.my-trigger[data-state='open'] {
  background: var(--accent);
}
```

## Scoped / contained dialog

Pass `[container]` to portal the dialog surface into a specific element instead of `document.body`. Pair it with `[modal]="false"` for a dialog scoped to a region of the page.

```html
<section #panel style="position: relative; height: 300px; overflow: hidden;">
  @if (open()) {
  <div forDialog [modal]="false" [container]="panel" (dismiss)="open.set(false)">
    <h2 forDialogTitle>Details</h2>
    <button forDialogClose>Close</button>
  </div>
  }
</section>
```

**CSS contract.** The container must be positioned (`position: relative`); the dialog surface must use `position: absolute` (not `fixed`) so it is bounded to the container's box. `[forDialogBackdrop]` portals to the same container — use `position: absolute` on the backdrop too so it fills the container rather than the viewport.

**`[container]` + `[modal]="true"` — region-isolating modal.** When both are set, the dialog isolates **within the container**: focus trap stays scoped to the dialog surface; inert siblings are applied to the container's other children only (body-level siblings outside the container stay interactive); and scroll lock targets the container's own `overflow`, not `<body>`. Programmatically: `ForDialogManager.open(Cmp, { modal: true, container: panelEl })`.

## Behavior notes

- **Mount equals open**. The directive does not manage `[hidden]` or any visibility attribute. The consumer's `@if (open())` controls presence, and `animate.enter` / `animate.leave` handle the visual transition.
- **Portal**: the dialog box is moved to `document.body` on first render (or to `container` when set). The backdrop portals alongside the dialog (to the same `container`, `document.body` by default). CSS scoped to ancestors won't apply — use global styles or classes.
- **Body scroll lock** is refcounted: stacking dialogs (or a dialog + a future overlay using the same lock) only restore on the last unlock.
- **Focus trap** scopes Tab inside the dialog box while `modal`. It does NOT itself mark the rest of the page `inert` — that's the inert-siblings utility's job (next bullet).
- **Inert siblings**. When `modal`, every direct child of `document.body` other than the dialog box (and its backdrop) gets `inert` and `aria-hidden="true"` while open, and is restored on close. This is what `aria-modal="true"` alone is missing — Safari + VoiceOver and several other AT pairings still announce siblings of an aria-modal node otherwise. Stacking is order-safe: when a second modal opens on top, the first becomes inert; closing the top dialog re-activates the underlying one.
- **Vetoable dismissals**. Each of `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)` fires before the corresponding `(dismiss)`. Call `preventDefault()` on the event to keep the dialog open (e.g. to ask "are you sure?" first).
- **The close button** (`[forDialogClose]`) always requests close, regardless of `dismissible`. Reason emitted is `'closeButton'`.
- **Both flows share the same engine** — the focus trap, scroll lock, dismissable layer, and portal in `ForDialogManager.open()` use the same `_internal/` utilities as the directive. Behavior is identical.
