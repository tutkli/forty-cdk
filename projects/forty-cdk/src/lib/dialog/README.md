# Dialog

Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) with focus trap, body scroll lock, Escape-to-close, portal rendering, and a programmatic `ForDialogManager.open()` API mirroring CDK's `Dialog`.

## Two flows, one engine

The same focus trap, scroll lock, portal, and dismissable-layer behaviors run under both APIs. Pick the one that fits the call site.

### Declarative — `[forDialog]`

The dialog is an overlay: **mount equals open**. The consumer's signal drives `@if`, and the directive emits `(close)` when it wants to be unmounted (Escape, backdrop, outside-pointer, outside-focus, close button). There is no `[(open)]` two-way binding on `[forDialog]` — the directive never opens itself, only requests close.

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
} from 'forty-cdk';

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
      <div forDialog id="confirm-delete" (close)="open.set(false)" animate.leave="fade-out">
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
  confirm() { /* ... */ this.open.set(false); }
}
```

Wrapping with `@if` is what makes Angular's native `animate.enter` / `animate.leave` work — they fire on real mount / unmount, not on attribute toggling.

### Programmatic — `ForDialogManager.open()`

```ts
import { Component, inject } from '@angular/core';
import { ForDialogManager, ForDialogRef, injectDialogData } from 'forty-cdk';

@Component({
  template: `
    <p>{{ data.message }}</p>
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
    const result = await ref.closed;     // 'confirm' | 'cancel' | undefined
    if (result === 'confirm') { /* ... */ }
  }
}
```

## Pieces (declarative)

| Class | Selector | Role |
| --- | --- | --- |
| `ForDialog` | `[forDialog]` | The dialog box. Owns `dismissible`, `modal`, `alert`, focus, scroll lock. |
| `ForDialogTrigger` | `[forDialogTrigger]` | Optional. Button that toggles `[(open)]` and reflects `aria-haspopup`/`aria-expanded`/`aria-controls`/`data-state`. |
| `ForDialogTitle` | `[forDialogTitle]` | Generates an id and registers it as `aria-labelledby`. |
| `ForDialogDescription` | `[forDialogDescription]` | Same, for `aria-describedby`. |
| `ForDialogClose` | `[forDialogClose]` | Button that requests close with reason `'closeButton'`. Accepts `[closeWith]` for programmatic mode. |
| `ForDialogBackdrop` | `[forDialogBackdrop]` | Optional overlay portaled to body. Direct click requests close with reason `'backdrop'` when `dismissible`. |

## Inputs (`ForDialog`)

| API | Default | Description |
| --- | --- | --- |
| `dismissible` | `true` | When `false`, Escape, backdrop, outside-pointer, and outside-focus do not request close. The close button still does. |
| `modal` | `true` | When `false`, no `aria-modal`, no scroll lock, no focus trap. |
| `alert` | `false` | Switches role to `alertdialog`. |
| `returnFocus` | `true` | Focus returns to the previously focused element on close. |
| `initialFocus` | `'first'` | `'first'` (first focusable inside) or `'container'` (the dialog host). |
| `ariaLabel` | `null` | Manual `aria-label` if no `[forDialogTitle]` is rendered. |

## Outputs (`ForDialog`)

`(close)` is the main signal — wire it to flip the `@if` gate. The four dismiss outputs receive the native event and are vetoable: call `preventDefault()` to suppress the subsequent `(close)` emission.

| Output | Payload | Fires on |
| --- | --- | --- |
| `close` | `ForDialogCloseReason` | Dialog wants to be unmounted. Reasons: `'escape'`, `'backdrop'`, `'pointerDownOutside'`, `'focusOutside'`, `'closeButton'`, `'programmatic'`. |
| `escapeKeyDown` | `KeyboardEvent` | Escape while this dialog is the topmost dismissable layer. |
| `pointerDownOutside` | `PointerEvent` | Pointer-down outside the dialog. |
| `focusOutside` | `FocusEvent` | Focus moves outside the dialog. |
| `interactOutside` | `PointerEvent \| FocusEvent` | Composite: fires alongside both of the above. |

## Programmatic API

| Symbol | Description |
| --- | --- |
| `ForDialogManager` | Injectable. `open(component, config?)` returns a `ForDialogRef<R>`. |
| `ForDialogRef<R>` | `close(result?)`, `closed: Promise<R \| undefined>`, `result: Signal<R \| undefined>`, `isClosed: Signal<boolean>`. |
| `FOR_DIALOG_DATA` | Token for the `data` payload. Inject in the opened component. |
| `injectDialogData<T>()` | Typed accessor for `FOR_DIALOG_DATA`. |

### `ForDialogOpenConfig`

| Field | Default | Description |
| --- | --- | --- |
| `data` | — | Payload available as `injectDialogData<T>()`. |
| `dismissible` | `true` | Escape closes when `true`. |
| `modal` | `true` | Sets `aria-modal`, locks body scroll, traps focus. |
| `alert` | `false` | Use `role="alertdialog"` instead of `"dialog"`. |
| `returnFocus` | `true` | Focus returns to the previously focused element on close. |
| `initialFocus` | `'first'` | `'first'` finds first focusable; `'container'` focuses the host. |
| `ariaLabel` | — | Manual accessible name when no title element is rendered. |
| `hostTag` | `'div'` | Tag name for the host element (e.g. `'section'`). |
| `providers` | `[]` | Extra providers for the opened component's injector. |

## Keyboard

- **Escape** requests close (reason `'escape'`) when `dismissible`.
- **Tab / Shift+Tab** cycles focus inside the dialog (focus trap, only when `modal`).
- **Click** on `[forDialogBackdrop]` requests close (reason `'backdrop'`) when `dismissible`.

## Behavior notes

- **Mount equals open**. The directive does not manage `[hidden]` or any visibility attribute. The consumer's `@if (open())` controls presence, and `animate.enter` / `animate.leave` handle the visual transition.
- **Portal**: the dialog box is moved to `document.body` on first render. The backdrop too if you use `[forDialogBackdrop]`. CSS scoped to ancestors won't apply — use global styles or classes.
- **Body scroll lock** is refcounted: stacking dialogs (or a dialog + a future overlay using the same lock) only restore on the last unlock.
- **Focus trap** scopes Tab inside the dialog box while `modal`. It does NOT mark the rest of the page `inert` — keyboard users are protected, mouse users still see / can hover outside (the backdrop is the consumer's pointer-events solution).
- **Vetoable dismissals**. Each of `(escapeKeyDown)`, `(pointerDownOutside)`, `(focusOutside)`, `(interactOutside)` fires before the corresponding `(close)`. Call `preventDefault()` on the event to keep the dialog open (e.g. to ask "are you sure?" first).
- **The close button** (`[forDialogClose]`) always requests close, regardless of `dismissible`. Reason emitted is `'closeButton'`.
- **Both flows share the same engine** — the focus trap, scroll lock, dismissable layer, and portal in `ForDialogManager.open()` use the same `_internal/` utilities as the directive. Behavior is identical.

## Accessibility notes

- Always provide an accessible name: render a `[forDialogTitle]` (sets `aria-labelledby`) or pass `ariaLabel`.
- `[forDialogDescription]` is optional — use it for non-title supporting copy (the question of a confirm, the rationale of an alert).
- `alert: true` interrupts assistive tech aggressively — only for genuine alerts (lost connection, unsaved changes warning), not for general confirms.
- Don't put interactive overlays (popovers, menus) outside the focus trap while a modal dialog is open — they won't be reachable. For a non-modal floating surface anchored to a trigger, use `[forPopover]` instead.
