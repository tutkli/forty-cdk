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

## Composition + styling model

Toast is "bring your own markup + classes", like every other primitive — even on the programmatic path where the viewport renders the markup for you. There are two levers:

### Per-toast classes

Pass `class` (a single token or a space-separated string) or `classList` (a string or an array of tokens) in the `show()` config. They are applied to the rendered toast root (the `[forToast]` element), merged with the directive's own host attributes — they never clobber `data-state` / `data-variant` / the swipe CSS hooks.

```ts
this.toasts.show({ title: 'Saved', variant: 'success', class: 'toast toast--success' });
this.toasts.show({ title: 'Failed', classList: ['toast', 'toast--error'] });
```

```css
/* Now you can target your own class instead of the [forToast] attribute. */
.toast {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}
.toast--success {
  border-inline-start: 4px solid green;
}
```

Declarative toasts (`<div forToast class="toast">`) take consumer classes the native way — `class` in `show()` is the programmatic equivalent. Styling by the `[forToast]` / `[forToastTitle]` / … attribute selectors still works and remains a valid choice; the class hook just unblocks design-system class names.

### Custom rendering with a `template`

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

**The helper directives work inside a custom `template`.** The viewport renders the template with the `[forToast]` injection context in scope, so `[forToastTitle]`, `[forToastDescription]`, `[forToastAction]`, and `[forToastClose]` keep their automatic `aria-labelledby` / `aria-describedby` / close-reason wiring — exactly as in the default shape. Just import the directives into the component that declares the `<ng-template>`:

```ts
@Component({
  imports: [ForToastViewport, ForToastTitle, ForToastDescription, ForToastAction, ForToastClose],
  // …
})
```

```html
<ng-template #toastTpl let-toast let-data="data">
  <div forToastTitle class="toast__title">{{ data.title }}</div>
  <div forToastDescription class="toast__desc">{{ data.body }}</div>
  <button forToastAction altText="Undo (Cmd+Z)" (click)="restore(data.item)">Undo</button>
  <button forToastClose class="toast__close" aria-label="Dismiss">×</button>
</ng-template>
```

`[forToastAction]` / `[forToastClose]` emit `(close)` (reason `'action'` / `'manual'`) through the same context as the default shape — no need to call `toast.dismiss()` manually for those. (`toast.dismiss()` from `$implicit` is still available for arbitrary buttons that aren't action / close.) This combines with per-toast `class`: add a `class` for the root and your own classes on the helper elements.

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

## Swipe-to-dismiss

Optional, opt-in. Set `[swipeDirection]` on a declarative toast (or via `swipeDirection` in the programmatic config / on the viewport) to let the user drag the toast off-screen with a touch or mouse pointer. The gesture uses pointer events, so it works on every input device.

```html
<div forToast swipeDirection="right" [swipeThreshold]="60" (close)="dismiss()">…</div>
```

`swipeDirection` accepts a single direction (`'left' | 'right' | 'up' | 'down'`) or an array of directions. The dominant axis of the user's drag picks which one wins; gestures perpendicular to every allowed direction are dropped. The dismiss commits when pointer-up happens past `swipeThreshold` pixels of pointer travel along the active direction (default `50`).

While the gesture is live the host carries:

| Attribute / variable            | Values                                   | Purpose                                                                         |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `data-swipe`                    | `"start" \| "move" \| "cancel" \| "end"` | Lifecycle marker — `"end"` means "about to fire `(close)` with reason `swipe`". |
| `data-swipe-direction`          | `"left" \| "right" \| "up" \| "down"`    | Direction the gesture armed in.                                                 |
| `--for-toast-swipe-movement-x` (px) | continuous                               | Horizontal pointer travel, clamped to the half-line of the active direction.    |
| `--for-toast-swipe-movement-y` (px) | continuous                               | Vertical pointer travel, clamped to the half-line of the active direction.      |

The directive does NOT animate anything — the consumer's CSS transitions / `animate.leave` drive the visual feedback:

```css
[forToast] {
  transition: transform 200ms ease-out;
  transform: translate3d(
    var(--for-toast-swipe-movement-x, 0px),
    var(--for-toast-swipe-movement-y, 0px),
    0
  );
}
[forToast][data-swipe='cancel'] {
  /* spring back */
  --for-toast-swipe-movement-x: 0px;
  --for-toast-swipe-movement-y: 0px;
}
```

Outputs:

- `(swipeStart)` — armed; emitted once with `{ direction, delta, originalEvent }`.
- `(swipeMove)` — every pointer move while active.
- `(swipeEnd)` — released past threshold (immediately followed by `(close)` with reason `'swipe'`).
- `(swipeCancel)` — released before threshold, or `pointercancel`.

`closable=false` disables swipe entirely — a sticky / forced-action toast cannot be user-dismissed.

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
