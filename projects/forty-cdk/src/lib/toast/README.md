# Toast

Headless toast notifications. The visible toast renders with `role="status"` (`'info'` / `'success'` / `'warning'`) or `role="alert"` (`'error'`) plus `aria-live` so screen readers announce updates without forcing focus, following the [WAI-ARIA Alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/).

Two ways to use the same primitive:

- **Programmatic** (the common path): inject `ForToastManager` and call `show({ title, … })` from anywhere.
- **Declarative**: drop `<div forToast>` directly in any template, controlling mount/unmount with `@if`.

## Pieces

| Class                 | Selector                                      | Role                                                                                                                                                                                         |
| --------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForToastManager`     | injectable                                    | Programmatic stack. `show()`, `dismiss(id)`, `dismissAll()`, reactive `toasts()` / `count()`.                                                                                                |
| `ForToastViewport`    | `[forToastViewport]` / `<for-toast-viewport>` | Mount once per region near the app root. `role="region"`, renders the toasts of its `[region]`. The F6 hotkey is coordinated once by the manager, so it never double-fires across viewports. |
| `ForToast`            | `[forToast]`                                  | One toast. `role="status"` / `role="alert"` per variant, timer, hover/focus pause, Escape-to-close.                                                                                          |
| `ForToastTitle`       | `[forToastTitle]`                             | Wires `aria-labelledby`.                                                                                                                                                                     |
| `ForToastDescription` | `[forToastDescription]`                       | Wires `aria-describedby`.                                                                                                                                                                    |
| `ForToastAction`      | `[forToastAction]`                            | Action button — emits `(dismiss)` with reason `'action'` after invoking your `(click)` handler. Accepts `[altText]` for WCAG 2.2.1 announcements.                                            |
| `ForToastClose`       | `[forToastClose]`                             | Close button — emits `(dismiss)` with reason `'manual'`. Carries `aria-label="Close"`.                                                                                                       |
| `ForToastRef<R>`      | handle                                        | Per-toast: `dismiss(reason, value)`, `update(patch)`, `closed: Promise`, signals of state.                                                                                                   |

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

## Multiple regions

A viewport renders only the toasts whose `region` matches its `[region]` input. Omit `region` everywhere and everything flows through the default region — that's the single-viewport setup above. To run independent regions (e.g. system notifications top-right, action confirmations bottom-center) mount one viewport per region and tag each `show()`:

```html
<for-toast-viewport region="system" />
<!-- styled top-right -->
<for-toast-viewport region="confirmations" />
<!-- styled bottom-center -->
```

```ts
this.toasts.show({ region: 'system', title: 'New version available' });
this.toasts.show({ region: 'confirmations', title: 'Saved' });
```

Each region resolves to the host `data-region` attribute, so you can position / theme regions purely from CSS:

```css
[forToastViewport][data-region='system'] {
  top: 1rem;
  right: 1rem;
}
[forToastViewport][data-region='confirmations'] {
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
}
```

If two viewports share the same region, only the first one mounted renders it; the rest stay inactive (and warn in dev) so a stray second viewport — a lazy route, a shared layout — never silently duplicates toasts. A single `show()` always produces exactly one toast node.

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
- `ref.update(patch)` — mutate config in place (text, duration, variant). `id` and `region` are fixed at `show()` and ignored here — `id` is the toast's identity, and `region` decides which viewport renders it, so changing it would silently remount the toast (resetting its timer and announcement). Dismiss and re-`show()` to move a toast between regions.
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

`[forToastAction]` / `[forToastClose]` emit `(dismiss)` (reason `'action'` / `'manual'`) through the same context as the default shape — no need to call `toast.dismiss()` manually for those. (`toast.dismiss()` from `$implicit` is still available for arbitrary buttons that aren't action / close.) This combines with per-toast `class`: add a `class` for the root and your own classes on the helper elements.

## Declarative usage

For a toast driven by component state (e.g. an offline banner):

```html
@if (offline()) {
<div
  forToast
  variant="warning"
  [duration]="0"
  (dismiss)="offline.set(false)"
  animate.leave="fade-out"
>
  <div forToastTitle>Network unavailable</div>
  <div forToastDescription>Reconnecting…</div>
</div>
}
```

The directive doesn't manage its own visibility — `@if` does. The directive emits `(dismiss)` when the timer / Escape / action / close button want it gone; the consumer reacts by flipping the gate.

## Swipe-to-dismiss

Optional, opt-in. Set `[swipeDirection]` on a declarative toast (or via `swipeDirection` in the programmatic config / on the viewport) to let the user drag the toast off-screen with a touch or mouse pointer. The gesture uses pointer events, so it works on every input device.

```html
<div forToast swipeDirection="right" [swipeThreshold]="60" (dismiss)="dismiss()">…</div>
```

`swipeDirection` accepts a single direction (`'left' | 'right' | 'up' | 'down'`) or an array of directions. The dominant axis of the user's drag picks which one wins; gestures perpendicular to every allowed direction are dropped. The dismiss commits when pointer-up happens past `swipeThreshold` pixels of pointer travel along the active direction (default `50`).

While the gesture is live the host carries:

| Attribute / variable                | Values                                   | Purpose                                                                                                                                                                                                                 |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-swipe`                        | `"start" \| "move" \| "cancel" \| "end"` | Lifecycle marker — `"end"` means "about to fire `(dismiss)` with reason `swipe`". `"cancel"` is parked (with the released movement vars) so your CSS can spring the toast back, then cleared on the next `pointerdown`. |
| `data-swipe-direction`              | `"left" \| "right" \| "up" \| "down"`    | Direction the gesture armed in.                                                                                                                                                                                         |
| `--for-toast-swipe-movement-x` (px) | continuous                               | Horizontal pointer travel, clamped to the half-line of the active direction.                                                                                                                                            |
| `--for-toast-swipe-movement-y` (px) | continuous                               | Vertical pointer travel, clamped to the half-line of the active direction.                                                                                                                                              |

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
[forToast][data-swipe='move'] {
  transition: none;
}
[forToast][data-swipe='cancel'] {
  transform: translate3d(0, 0, 0);
}
```

Spring the toast back by resetting **`transform`** on `[data-swipe='cancel']` — not by zeroing the `--for-toast-swipe-movement-*` variables. The directive publishes those variables as **inline styles** on the host and holds them at the released delta through the cancel, so a stylesheet rule that tries to set them to `0` loses to the inline value and has no effect (the toast would stay stuck at the release position). Overriding `transform` sidesteps the inline variables entirely. After a cancel the host keeps `data-swipe="cancel"` and the parked movement vars so the transition above can run on its own timeline; the directive then clears that parked state — `data-swipe` removed, movement vars zeroed — on the next `pointerdown`, so a stale `cancel` never bleeds into the next gesture or lingers after a CSS-less consumer. A re-armed swipe overwrites it anyway.

Outputs:

- `(swipeStart)` — armed; emitted once with `{ direction, delta, originalEvent }`.
- `(swipeMove)` — every pointer move while active.
- `(swipeEnd)` — released past threshold (immediately followed by `(dismiss)` with reason `'swipe'`).
- `(swipeCancel)` — released before threshold, or `pointercancel`.

`closable=false` disables swipe entirely — a sticky / forced-action toast cannot be user-dismissed.

## Auto-dismiss + pause-on-hover

- Timer starts on mount and fires `(dismiss)` with reason `'auto'` after `duration` ms.
- Hovering or focusing inside the toast pauses the timer; leaving / blurring resumes with the remaining time.
- The timer also pauses while `document.visibilityState !== 'visible'` (tab backgrounded, window hidden) and resumes when the page becomes visible again, so toasts don't silently expire while the user is not looking. The `visibilitychange` listener is shared across all live toasts (refcounted) — one document-level handler regardless of stack depth.
- A hover/focus/visibility pause captures the **remaining** time and resumes with it. A `ref.update()` that re-renders the toast while it is paused does not reset that captured time — resume always continues the countdown, never restarts it at the full duration.
- `duration: 0` keeps the toast sticky — only manual / action / programmatic close ends it.

> **`maxVisible` parks overflow, it does not expire it.** A toast pushed out of the visible window by `[maxVisible]` is unmounted, so its auto-dismiss timer is not running while it waits. When a newer toast is dismissed it re-enters the window and its `duration` countdown restarts from full (a fresh `[forToast]` mounts). If you need overflow toasts to clear on a deadline, dismiss them explicitly (`ForToastRef.dismiss()` / `dismissAll()` / the action / close button) rather than relying on the timer.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes below.

Toast pieces (`[forToast]`, `[forToastTitle]`, `[forToastDescription]`, `[forToastAction]`, `[forToastClose]`) are rendered _inside_ the library's `<for-toast-viewport>` component on the programmatic path, so they cannot take a consumer class directly — style them with **global attribute selectors** (e.g. `[forToast][data-variant='error']`). The exception is per-toast `class` / `classList` in the `show()` config, which the viewport applies to the `[forToast]` root for you (see [Per-toast classes](#per-toast-classes)). Only `<for-toast-viewport>` itself lives in the consumer's own template, so it is the one element that can take an ordinary `class`. Declarative toasts (`<div forToast class="…">`) take consumer classes the native way.

### Data attributes

| Piece                                         | Attribute                | Values                                                                                                      |
| --------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `[forToast]`                                  | `data-state`             | `open` (always present while mounted; the consumer unmounts on close, so there is no `closed` state)        |
| `[forToast]`                                  | `data-variant`           | `info` &#124; `success` &#124; `warning` &#124; `error`                                                     |
| `[forToast]`                                  | `data-paused`            | present / absent (the auto-dismiss timer is paused)                                                         |
| `[forToast]`                                  | `data-swipe`             | `start` &#124; `move` &#124; `cancel` &#124; `end` (absent until a swipe gesture begins)                    |
| `[forToast]`                                  | `data-swipe-direction`   | `left` &#124; `right` &#124; `up` &#124; `down` (absent until a swipe arms)                                 |
| `[forToast]`                                  | `data-front-stack-index` | `0`-based index in the visible stack (set by the viewport on the programmatic path; `0` is the front toast) |
| `[forToastViewport]` / `<for-toast-viewport>` | `data-region`            | the viewport's region name (default `default`)                                                              |
| `[forToastViewport]` / `<for-toast-viewport>` | `data-toast-count`       | number of toasts currently rendered                                                                         |

### CSS custom properties

Written on the `[forToast]` host while a swipe gesture is live, so the consumer can drive a transform-based animation entirely from CSS.

| Property                       | Meaning                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `--for-toast-swipe-movement-x` | Horizontal pointer travel in px, clamped to the active swipe direction. |
| `--for-toast-swipe-movement-y` | Vertical pointer travel in px, clamped to the active swipe direction.   |

```css
[forToast] {
  transition: transform 200ms ease-out;
  transform: translate3d(
    var(--for-toast-swipe-movement-x, 0px),
    var(--for-toast-swipe-movement-y, 0px),
    0
  );
}
[forToast][data-swipe='move'] {
  transition: none;
}
[forToast][data-swipe='cancel'] {
  transform: translate3d(0, 0, 0);
}
[forToast][data-variant='error'] {
  border-inline-start: 4px solid red;
}
```

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

- `aria-atomic="true"` on the toast means that when the host's own `aria-live` region announces, the screen reader reads the **whole** toast rather than only the changed node. It does **not** by itself guarantee a re-announcement on a `ref.update()` text change, and it is irrelevant on the silenced (`altText`) path where `aria-live` is `off`. Re-announcement on update is driven explicitly — see [Live updates and announcements](#live-updates-and-announcements) below.
- `aria-labelledby` and `aria-describedby` wire automatically from `[forToastTitle]` / `[forToastDescription]`. Multiple titles / descriptions concatenate ids.
- `role="alert"` (variant `error`) interrupts the screen reader queue; reserve it for genuinely interrupting messages.
- The viewport's `role="region"` with `aria-label` makes it discoverable in landmark navigation; the `F6` hotkey is the standard "jump to notifications" shortcut.
- Pause on hover / focus is mandated by [WCAG 2.1 SC 2.2.1](https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html) for time-limited content.
- Action buttons should set `[altText]` whenever the visible label (e.g. `"Undo"`) wouldn't tell a user how to recover the action after the toast disappears. When at least one `[forToastAction]` carries a non-empty `altText`, the toast silences its host `aria-live` and routes a synthesized announcement (`title. description. altText`) through the shared `LiveAnnouncer` — meeting [WCAG SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) for non-recoverable, time-limited actions.

  ```html
  <button forToastAction altText="Undo (Cmd+Z)" (click)="restore()">Undo</button>
  ```

### Live updates and announcements

A toast announces on two paths, picked automatically:

- **Host `aria-live` (default).** With no `altText` anywhere in the toast, the host carries `aria-live="polite"` (or `assertive` for `error`). The screen reader reads the toast when it mounts and, thanks to `aria-atomic`, re-reads the whole toast when the host region's text changes.
- **`LiveAnnouncer` (silenced path).** As soon as any `[forToastAction]` carries a non-empty `altText`, the host `aria-live` is set to `off` and the toast composes its message (`title. description. altText`) from the **rendered title / description / altText** and pushes it through the shared off-screen `LiveAnnouncer`.

Both paths are reactive. A late-bound `altText` (set after first render) and any `ref.update()` that changes the title, description, or `altText` re-announces — the composed message is tracked, and an unchanged message never re-fires. This is why the contract is "drive announcements explicitly", not "trust `aria-atomic`": `aria-atomic` does nothing on the silenced path, so the directive owns the re-announce.

```ts
const ref = this.toasts.show({ title: 'Saving…', duration: 0 });
// Re-announced automatically when the text changes:
await api.save();
ref.update({ title: 'Saved', variant: 'success', duration: 3000 });
```
