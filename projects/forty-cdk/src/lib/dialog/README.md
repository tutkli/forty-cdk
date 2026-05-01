# Dialog

Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) with focus trap, body scroll lock, Escape-to-close, portal rendering, and a programmatic `ForDialogs.open()` API mirroring CDK's `Dialog`.

## Two flows, one engine

The same focus trap, scroll lock, portal, and Escape behaviors run under both APIs. Pick the one that fits the call site.

### Declarative — `[forDialog]`

```ts
import { Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogTitle,
} from 'forty-cdk';

@Component({
  selector: 'demo-confirm',
  imports: [ForDialog, ForDialogTitle, ForDialogDescription, ForDialogClose, ForDialogBackdrop],
  template: `
    <button type="button" (click)="open.set(true)">Delete account</button>

    <div forDialog [(open)]="open">
      <div forDialogBackdrop class="my-backdrop"></div>
      <h2 forDialogTitle>Delete account?</h2>
      <p forDialogDescription>This permanently removes your data.</p>
      <button forDialogClose>Cancel</button>
      <button (click)="confirm()">Delete</button>
    </div>
  `,
})
export class DemoConfirm {
  readonly open = signal(false);
  confirm() { /* ... */ this.open.set(false); }
}
```

### Programmatic — `ForDialogs.open()`

```ts
import { Component, inject } from '@angular/core';
import { ForDialogs, ForDialogRef, injectDialogData } from 'forty-cdk';

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
  readonly dialogs = inject(ForDialogs);

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
| `ForDialog` | `[forDialog]` | The dialog box. Owns `open`, `dismissible`, `modal`, `alert`, focus, scroll lock. |
| `ForDialogTitle` | `[forDialogTitle]` | Generates an id and registers it as `aria-labelledby`. |
| `ForDialogDescription` | `[forDialogDescription]` | Same, for `aria-describedby`. |
| `ForDialogClose` | `[forDialogClose]` | Button that closes the dialog. Accepts `[closeWith]` for programmatic mode. |
| `ForDialogBackdrop` | `[forDialogBackdrop]` | Optional overlay. Click closes when `dismissible`. Must be a child of `[forDialog]` in the template. |

## Programmatic API

| Symbol | Description |
| --- | --- |
| `ForDialogs` | Injectable. `open(component, config?)` returns a `ForDialogRef<R>`. |
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

## Inputs (declarative `ForDialog`)

| API | Default | Description |
| --- | --- | --- |
| `open` | `false` | Two-way bindable visibility. |
| `dismissible` | `true` | When `false`, Escape and backdrop click are ignored. |
| `modal` | `true` | When `false`, no `aria-modal`, no scroll lock, no trap. |
| `alert` | `false` | Switches role to `alertdialog`. |
| `returnFocus` | `true` | Focus returns to the previously focused element on close. |
| `initialFocus` | `'first'` | `'first'` or `'container'`. |
| `ariaLabel` | `null` | Manual `aria-label` if no `forDialogTitle` is rendered. |

## Keyboard

- **Escape** closes the dialog when `dismissible`.
- **Tab / Shift+Tab** cycles focus inside the dialog (focus trap).
- **Click** on `forDialogBackdrop` closes when `dismissible`.

## Behavior notes

- **Portal**: the dialog box is moved to `document.body` on first render. Backdrop too if you use `forDialogBackdrop`. CSS scoped to ancestors won't apply — use global styles or classes.
- **Body scroll lock** is refcounted: stacking dialogs (or a tooltip + dialog combo using the same lock) only restore on the last unlock.
- **Focus trap** scopes Tab inside the dialog box. It does NOT mark the rest of the page `inert` — keyboard users are protected, mouse users still see / can hover outside (the backdrop is the consumer's pointer-events solution).
- **The close button** (`forDialogClose`) closes regardless of `dismissible`. Escape and backdrop honor `dismissible`.
- **Inside the opened component (programmatic)**, inject `ForDialogRef` for control and `FOR_DIALOG_DATA` (or `injectDialogData<T>()`) for the payload.
- **Both flows share the same engine** — the focus trap, scroll lock, escape handler, and portal in `ForDialogs.open()` use the same `_internal/focus-trap.ts` and `_internal/body-scroll-lock.ts` as the directive. Behavior is identical.

## Accessibility notes

- Always provide an accessible name: render a `[forDialogTitle]` (sets `aria-labelledby`) or pass `ariaLabel`.
- `[forDialogDescription]` is optional — use it for non-title supporting copy (the question of a confirm, the rationale of an alert).
- `alert: true` interrupts assistive tech aggressively — only for genuine alerts (lost connection, unsaved changes warning), not for general confirms.
- Don't put interactive overlays (popovers, menus) outside the focus trap while the dialog is open — they won't be reachable.

## v1 limitations (deferred)

- **No `inert` attribute** on body siblings. Focus trap covers keyboard isolation; pointer isolation is the consumer's CSS job (typically a backdrop). `inert` polyfill / management can be added when there's a real consumer need.
- **No animations**. The dialog flips between `[hidden]` and visible. Style `data-state="open|closed"` for transitions; remove `[hidden]` requires JS-driven animation hooks (deferred).
- **No drag / resize**. Use a different primitive (Drawer, Sheet) for those.
