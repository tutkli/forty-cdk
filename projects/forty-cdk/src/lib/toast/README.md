# Toast

Headless toast notifications. The visible toast renders with `role="status"` (`'info'` / `'success'` / `'warning'`) or `role="alert"` (`'error'`) plus `aria-live` so screen readers announce updates without forcing focus, following the [WAI-ARIA Alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/).

Two ways to use the same primitive:

- **Programmatic** (the common path): inject `ForToastManager` and call `show({ title, … })` from anywhere.
- **Declarative**: drop `<div forToast>` directly in any template, controlling mount/unmount with `@if`.

## Pieces

| Class                 | Selector                                      | Role                                                                                                                                            |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForToastManager`     | injectable                                    | Programmatic stack. `show()`, `dismiss(id)`, `dismissAll()`, reactive `toasts()` / `count()`.                                                   |
| `ForToastViewport`    | `[forToastViewport]` / `<for-toast-viewport>` | Mount once near the app root. `role="region"`, hosts the F6 hotkey, renders programmatic toasts.                                                |
| `ForToast`            | `[forToast]`                                  | One toast. `role="status"` / `role="alert"` per variant, timer, hover/focus pause, Escape-to-close.                                             |
| `ForToastTitle`       | `[forToastTitle]`                             | Wires `aria-labelledby`.                                                                                                                        |
| `ForToastDescription` | `[forToastDescription]`                       | Wires `aria-describedby`.                                                                                                                       |
| `ForToastAction`      | `[forToastAction]`                            | Action button — emits `(close)` with reason `'action'` after invoking your `(click)` handler. Accepts `[altText]` for WCAG 2.2.1 announcements. |
| `ForToastClose`       | `[forToastClose]`                             | Close button — emits `(close)` with reason `'manual'`. Carries `aria-label="Close"`.                                                            |
| `ForToastRef<R>`      | handle                                        | Per-toast: `dismiss(reason, value)`, `update(patch)`, `closed: Promise`, signals of state.                                                      |

## Mount the viewport once

In your `app.html`:

```html
<for-toast-viewport [maxVisible]="5" />
```

Position it from CSS — the directive doesn't impose layout:

```css
[forToastViewport] {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: grid;
  gap: 0.5rem;
  pointer-events: none;
}
[forToast] {
  pointer-events: auto;
}
```

## Programmatic API

```ts
import { ForToastManager } from 'forty-cdk';

@Component(/* … */)
class SomeComponent {
  readonly toasts = inject(ForToastManager);

  save() {
    const ref = this.toasts.show({ title: 'Saving…', duration: 0 });
    api.save().then(
      () => ref.update({ title: 'Saved', variant: 'success', duration: 3000 }),
      () => ref.update({ title: 'Save failed', variant: 'error' }),
    );
  }

  undoableDelete(item: Item) {
    this.toasts.show({
      title: 'Item deleted',
      action: { label: 'Undo', onClick: () => restore(item) },
      duration: 6000,
    });
  }
}
```

`show()` returns a `ForToastRef`:

- `ref.dismiss(reason?, result?)` — close imperatively.
- `ref.update(patch)` — mutate config in place (text, duration, variant).
- `ref.closed` — `Promise<{ reason, result }>` resolved on first dismiss.
- `ref.isClosed()` — reactive boolean.
- `ref.config()` — reactive config snapshot.

## Custom rendering

If the default title / description / action / close shape isn't enough, pass a `template`:

```html
<ng-template #toastTpl let-toast let-data="data">
  <span>{{ data.user.name }} liked your post</span>
  <button type="button" (click)="goToPost(data.post); toast.dismiss()">View</button>
</ng-template>
```

```ts
this.toasts.show({ template: this.toastTpl, data: { user, post } });
```

The template context is `{ $implicit: ForToastInstance, data: T }`. Use `toast.dismiss()` to close from inside the template.

> **Note**: custom templates declared in your component can't use the `[forToastTitle]` / `[forToastAction]` / `[forToastClose]` directives — those rely on the `[forToast]` injection context, which Angular's `ngTemplateOutlet` does not propagate from the rendering host. Either accept the default rendering, or write fully custom markup using `toast.dismiss()` for close behavior.

## Declarative usage

For a toast driven by component state (e.g. an offline banner):

```html
@if (offline()) {
<div
  forToast
  variant="warning"
  [duration]="0"
  (close)="offline.set(false)"
  animate.leave="fade-out"
>
  <div forToastTitle>Network unavailable</div>
  <div forToastDescription>Reconnecting…</div>
</div>
}
```

The directive doesn't manage its own visibility — `@if` does. The directive emits `(close)` when the timer / Escape / action / close button want it gone; the consumer reacts by flipping the gate.

## Auto-dismiss + pause-on-hover

- Timer starts on mount and fires `(close)` with reason `'auto'` after `duration` ms.
- Hovering or focusing inside the toast pauses the timer; leaving / blurring resumes with the remaining time.
- The timer also pauses while `document.visibilityState !== 'visible'` (tab backgrounded, window hidden) and resumes when the page becomes visible again, so toasts don't silently expire while the user is not looking. The `visibilitychange` listener is shared across all live toasts (refcounted) — one document-level handler regardless of stack depth.
- `duration: 0` keeps the toast sticky — only manual / action / programmatic close ends it.

## Keyboard

- Toast announcements never steal focus. The user keeps typing.
- The configured **hotkey** (default `F6`) anywhere in the document focuses the first visible toast.
- Inside a toast: **Tab** cycles between action / close buttons; **Escape** dismisses (when `closable`); **Shift+Tab** returns out.

## Variants

| Variant            | Role     | aria-live   | Use for                                  |
| ------------------ | -------- | ----------- | ---------------------------------------- |
| `info` _(default)_ | `status` | `polite`    | Neutral notifications.                   |
| `success`          | `status` | `polite`    | Confirmations of completed actions.      |
| `warning`          | `status` | `polite`    | Non-blocking warnings.                   |
| `error`            | `alert`  | `assertive` | Failures that interrupt the user's task. |

`data-variant` is reflected on the host so consumers can paint per-variant icons / colors purely from CSS.

## Global defaults

```ts
import { provideForToastDefaults } from 'forty-cdk';

bootstrapApplication(App, {
  providers: [provideForToastDefaults({ duration: 4000, hotkey: 'F6', maxVisible: 5 })],
});
```

Per-viewport overrides take precedence: `<for-toast-viewport [maxVisible]="3" hotkey="F8" />`.

## Accessibility notes

- `aria-atomic="true"` on the toast ensures the entire toast is re-announced if any text changes (live updates).
- `aria-labelledby` and `aria-describedby` wire automatically from `[forToastTitle]` / `[forToastDescription]`. Multiple titles / descriptions concatenate ids.
- `role="alert"` (variant `error`) interrupts the screen reader queue; reserve it for genuinely interrupting messages.
- The viewport's `role="region"` with `aria-label` makes it discoverable in landmark navigation; the `F6` hotkey is the standard "jump to notifications" shortcut and matches Radix.
- Pause on hover / focus is mandated by [WCAG 2.1 SC 2.2.1](https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html) for time-limited content.
- Action buttons should set `[altText]` whenever the visible label (e.g. `"Undo"`) wouldn't tell a user how to recover the action after the toast disappears. When at least one `[forToastAction]` carries a non-empty `altText`, the toast silences its host `aria-live` and routes a synthesized announcement (`title. description. altText`) through the shared `LiveAnnouncer` — meeting [WCAG SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) for non-recoverable, time-limited actions.

  ```html
  <button forToastAction altText="Undo (Cmd+Z)" (click)="restore()">Undo</button>
  ```
