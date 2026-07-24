# Drawer

A side or bottom sheet built on the modal dialog pattern, adding pointer-driven swipe-to-dismiss and snap points.

It shares the same focus trap, scroll lock, Escape-to-close, dismissable-layer, and portal behaviors as `ForDialog`, plus a pointer-driven drag engine.

## Anatomy

```html
<button forDrawerTrigger [(open)]="open" controls="filters">Filters</button>

<!-- rendered only while open() is true -->
<div forDrawer id="filters" side="bottom" (dismiss)="open.set(false)">
  <div forDrawerBackdrop></div>
  <div forDrawerHandle aria-hidden="true"></div>
  <h2 forDrawerTitle>Filters</h2>
  <p forDrawerDescription>Apply filters to the listing.</p>
  <button forDrawerClose>Close</button>
</div>

<!-- only when a [scaleBackground] drawer should scale the app shell -->
<div forDrawerWrapper>
  <!-- app shell -->
</div>
```

## Two flows, one engine

Same engine as Dialog: the directive composes focus trap + scroll lock + dismissable layer + portal + (additionally) swipe-dismiss. Pick declarative or programmatic.

### Declarative — `[forDrawer]`

Mount equals open. The consumer's signal drives `@if`; the directive emits `(dismiss)` when it wants to be unmounted.

```ts
import { Component, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  type ForDrawerSnapPoint,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

@Component({
  selector: 'demo-filters',
  imports: [
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <button forDrawerTrigger [(open)]="open" controls="filters-drawer">Filters</button>

    @if (open()) {
      <div
        forDrawer
        id="filters-drawer"
        side="bottom"
        [snapPoints]="snaps"
        [(activeSnapPoint)]="snap"
        (dismiss)="open.set(false)"
        animate.enter="slide-up"
        animate.leave="slide-down"
      >
        <div
          forDrawerBackdrop
          class="drawer-backdrop"
          animate.enter="fade-in"
          animate.leave="fade-out"
        ></div>
        <div forDrawerHandle aria-hidden="true"></div>
        <h2 forDrawerTitle>Filters</h2>
        <p forDrawerDescription>Apply filters to the listing.</p>
        <button forDrawerClose>Close</button>
      </div>
    }
  `,
})
export class DemoFilters {
  readonly open = signal(false);
  readonly snaps: ReadonlyArray<ForDrawerSnapPoint> = ['148px', '50%', 1];
  readonly snap = signal<ForDrawerSnapPoint | null>(null);
}
```

Wrapping with `@if` is what makes Angular's native `animate.enter` / `animate.leave` work — they fire on real mount / unmount, not on attribute toggling.

### Programmatic — `ForDrawerManager.open()`

The manager mounts the user component underneath the same `[forDrawer]` directive that powers the declarative shape, so every child piece (`[forDrawerTitle]`, `[forDrawerDescription]`, `[forDrawerBackdrop]`, `[forDrawerHandle]`, `[forDrawerClose]`) and every `ForDrawer` input (`side`, `snapPoints`, `swipeToDismiss`, `closeThreshold`, `handleOnly`, `scaleBackground`, `setBackgroundColorOnScale`, `fadeFromIndex`, …) work identically. `[forDrawerClose] [closeWith]` propagates straight through to `ForDrawerRef.close(value)`.

```ts
import { Component, inject } from '@angular/core';
import {
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerManager,
  ForDrawerRef,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk/drawer';

@Component({
  imports: [
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div
      forDrawerBackdrop
      class="drawer-backdrop"
      animate.enter="fade-in"
      animate.leave="fade-out"
    ></div>
    <div forDrawerHandle aria-hidden="true"></div>
    <h2 forDrawerTitle>Delete account?</h2>
    <p forDrawerDescription>{{ data?.message }}</p>
    <button forDrawerClose [closeWith]="'cancel'">Cancel</button>
    <button forDrawerClose [closeWith]="'confirm'">Confirm</button>
  `,
})
class ConfirmDrawer {
  readonly data = injectDrawerData<{ message: string }>();
  readonly ref = inject(ForDrawerRef) as ForDrawerRef<'confirm' | 'cancel'>;
}

@Component({
  selector: 'demo-host',
  template: `<button (click)="askToDelete()">Delete</button>`,
})
class DemoHost {
  readonly #drawers = inject(ForDrawerManager);

  async askToDelete(): Promise<void> {
    const ref = this.#drawers.open<ConfirmDrawer, 'confirm' | 'cancel'>(ConfirmDrawer, {
      data: { message: 'This action cannot be undone.' },
      side: 'bottom',
      snapPoints: ['148px', 1],
    });
    const { result } = await ref.closed;
    if (result === 'confirm') {
      // ...
    }
  }
}
```

`injectDrawerData<T>()` is typed `T | null`: the manager provides `null` when `open()` is called without `data`, so guard (`data?.message`) before dereferencing the payload. `await ref.closed` resolves `{ reason, result }` — the `reason` (a `ForDrawerCloseReason`) tells apart an imperative `close()` (`'programmatic'`) from Escape / backdrop / outside / swipe / close-button dismissals.

Drawers opened by the manager join the same `ForDrawerStack` as declarative ones, so mixed stacking (a programmatic drawer over a declarative parent, or vice versa) reflects correct `data-depth` / `data-state-nested` and routes Escape through the LIFO dismissable layer.

**Styling the programmatic overlay root.** The manager creates the `[forDrawer]` host for you and it is class-less. Pass `class` / `classList` to style it — the tokens land on the real host alongside `data-side` / `data-state` / the `--for-drawer-translate` custom property, so positioning CSS keyed on `data-side` works:

```ts
this.#drawers.open(ConfirmDrawer, { data, side: 'bottom', class: 'my-drawer' });
```

```css
.my-drawer[data-side='bottom'] {
  inset: auto 0 0 0;
}
```

**Enter / exit animations.** A programmatic drawer is portaled to `document.body` and torn down imperatively, so the consumer can't attach `animate.leave` to the host the way a declarative `@if` block can. Pass `animateEnter` / `animateLeave` (CSS class names) instead: the manager applies `animateEnter` on mount (via `animate.enter`) and, on `close()`, keeps the host mounted with `animateLeave` until its CSS animations / transitions finish before tearing down. `close()` still resolves its promise and flips `isClosed()` immediately — only the visual teardown waits. Set them once for a scope with `provideForDrawerDefaults({ animateEnter, animateLeave })`; a per-`open()` value wins over the scope default.

```ts
this.#drawers.open(ConfirmDrawer, {
  data,
  side: 'bottom',
  class: 'my-drawer',
  animateEnter: 'drawer-in',
  animateLeave: 'drawer-out',
});
```

`class` is a single or space-separated string; `classList` is an array or space-separated string; both merge and de-dup and never clobber the host attributes. This replaces the old `inject(FOR_DRAWER_CONTEXT).hostElement.classList.add('my-drawer')` workaround.

**Observing drag / release / active snap point.** A snap-point drawer opened imperatively has the same observability as the declarative `(dragMove)` / `(release)` / `(activeSnapPointChange)` outputs, via config callbacks of the same name:

```ts
this.#drawers.open(ConfirmDrawer, {
  data,
  snapPoints: ['148px', '50%', 1],
  defaultSnapPoint: '148px',
  dragMove: ({ percentageDragged }) => this.dragProgress.set(percentageDragged),
  release: ({ willClose, nextSnapPoint }) => {
    /* … */
  },
  activeSnapPointChange: (snap) => this.activeSnap.set(snap),
});
```

`activeSnapPointChange` fires with the landed snap on the mount-time default and every drag release — the read-back the declarative API exposes through `[(activeSnapPoint)]`. All three subscriptions are released automatically when the drawer closes.

**Driving the active snap point.** `ForDrawerRef.setActiveSnapPoint(snap)` moves a snap-point drawer to a new snap after open — the programmatic equivalent of _writing_ `[(activeSnapPoint)]` on the declarative `[forDrawer]`. `ref.activeSnapPoint()` is the matching reactive read (it also reflects the drawer's own internal transitions — the mount-time default and every drag release):

```ts
const ref = this.#drawers.open(ConfirmDrawer, {
  data,
  snapPoints: ['148px', '50%', 1],
  defaultSnapPoint: '148px',
});
ref.setActiveSnapPoint('50%'); // slide to the mid snap
ref.activeSnapPoint(); // => '50%'
```

Like the declarative model it does not validate the argument against `snapPoints` (the drag engine tolerates a non-member), it is a no-op once the drawer has closed, and it is meaningful only when `snapPoints` are configured. The surface movement is the consumer's CSS keyed off the reflected `data-active-snap-point` attribute (see [Positioning the snaps](#positioning-the-snaps-css-contract)); `setActiveSnapPoint` only sets the state. As with `[(activeSnapPoint)]`, driving the snap this way does **not** re-fire the `activeSnapPointChange` callback (that fires only on the drawer's own internal transitions).

### Per-channel dismissal (Escape-only drawers)

`dismissible` is **not** all-or-nothing. The four dismiss channels — Escape, pointer-down-outside, focus-outside, and the composite outside-interaction — are independently vetoable on both APIs, so you can keep some live and suppress others (e.g. a non-modal floater that closes on Escape but stays put on an outside click). Programmatically the channels are callbacks on the open config, mirroring the `autoFocusOn*` shape:

```ts
this.#drawers.open(ConfirmDrawer, {
  data,
  modal: false,
  // dismissible: true (the default) keeps Escape live.
  interactOutside: (event) => event.preventDefault(), // ignore outside interaction
  // escapeKeyDown / pointerDownOutside / focusOutside are available too.
});
```

Declaratively the same recipe is the four vetoable outputs on `[forDrawer]`: `(interactOutside)="$event.preventDefault()"` suppresses the outside-click close while Escape (its own channel) still closes; veto `(escapeKeyDown)` instead to suppress Escape. Each callback's / output's `event.event` carries the originating DOM event. The callbacks behave identically to the outputs — same events, same veto semantics — and are torn down with the drawer.

## API

### `ForDrawer`

| Property                    | Type                                                                | Description                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `side`                      | `'top' \| 'right' \| 'bottom' \| 'left'`                            | Anchored edge. Drives swipe direction and `data-side`.<br>**Default:** `'bottom'`                                                                                                                            |
| `modal`                     | `boolean`                                                           | `aria-modal`, scroll lock, focus trap, inert siblings.<br>**Default:** `true`                                                                                                                                |
| `dismissible`               | `boolean`                                                           | Whether Escape / backdrop / outside / swipe close.<br>**Default:** `true`                                                                                                                                    |
| `alert`                     | `boolean`                                                           | `role="alertdialog"`.<br>**Default:** `false`                                                                                                                                                                |
| `returnFocus`               | `boolean`                                                           | Restore focus on close.<br>**Default:** `true`                                                                                                                                                               |
| `initialFocus`              | `'first' \| 'container'`                                            | **Default:** `'first'`                                                                                                                                                                                       |
| `ariaLabel`                 | `string \| null`                                                    | Use when no visible title is rendered.<br>**Default:** `null`                                                                                                                                                |
| `animateEnter`              | `string`                                                            | CSS class applied on mount (via `animate.enter`) to play an enter animation.<br>**Default:** —                                                                                                               |
| `animateLeave`              | `string`                                                            | CSS class applied on close; the host stays mounted until its animation finishes, then tears down.<br>**Default:** —                                                                                          |
| `autoFocusOnOpen`           | `(e: VetoableEvent) => void` \| `undefined`                         | `event.preventDefault()` skips the imperative focus move.<br>**Default:** —                                                                                                                                  |
| `autoFocusOnClose`          | `(e: VetoableEvent) => void` \| `undefined`                         | Fires on every close path regardless of mode. In non-modal mode the directive doesn't move focus, so the veto is informational; in modal mode `event.preventDefault()` skips return-focus.<br>**Default:** — |
| `swipeToDismiss`            | `boolean`                                                           | Disabled automatically under `prefers-reduced-motion: reduce`.<br>**Default:** `true`                                                                                                                        |
| `closeThreshold`            | `number`                                                            | Fraction past which a release dismisses — of the full dimension without `snapPoints`, of the lowest snap's extent with them.<br>**Default:** `0.25`                                                          |
| `handleOnly`                | `boolean`                                                           | Swipe arms only on the registered `[forDrawerHandle]`.<br>**Default:** `false`                                                                                                                               |
| `snapPoints`                | `ReadonlyArray<ForDrawerSnapPoint>`                                 | `number ∈ [0,1]` \| `'NN%'` \| `'NNpx'`. Strictly increasing.<br>**Default:** —                                                                                                                              |
| `activeSnapPoint`           | `ModelSignal<ForDrawerSnapPoint \| null>`                           | Two-way bindable. Initialised to `snapPoints[0]` on mount when null.<br>**Default:** `null`                                                                                                                  |
| `fadeFromIndex`             | `number`                                                            | Backdrop reflects `data-fade-from-active` once active >= this index.<br>**Default:** —                                                                                                                       |
| `scaleBackground`           | `boolean`                                                           | Asks `[forDrawerWrapper]` to scale + translate behind the drawer.<br>**Default:** `false`                                                                                                                    |
| `setBackgroundColorOnScale` | `boolean`                                                           | Paints `<body>` to mask the gap between scaled wrapper and viewport edge.<br>**Default:** `true`                                                                                                             |
| `dismiss`                   | `OutputEmitterRef<ForDrawerCloseReason>`                            | Output. Wire to `(dismiss)="open.set(false)"`.<br>**Default:** —                                                                                                                                             |
| `escapeKeyDown`             | `OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>`              | Output. `preventDefault()` suppresses auto-close.<br>**Default:** —                                                                                                                                          |
| `pointerDownOutside`        | `OutputEmitterRef<VetoableNativeEvent<PointerEvent>>`               | Output. `preventDefault()` suppresses auto-close.<br>**Default:** —                                                                                                                                          |
| `focusOutside`              | `OutputEmitterRef<VetoableNativeEvent<FocusEvent>>`                 | Output. `preventDefault()` suppresses auto-close.<br>**Default:** —                                                                                                                                          |
| `interactOutside`           | `OutputEmitterRef<VetoableNativeEvent<PointerEvent \| FocusEvent>>` | Output. Composite — vetoed by either specific event.<br>**Default:** —                                                                                                                                       |
| `dragMove`                  | `OutputEmitterRef<ForDrawerDragEvent>`                              | Output. Streams `percentageDragged` and the originating `PointerEvent`.<br>**Default:** —                                                                                                                    |
| `release`                   | `OutputEmitterRef<ForDrawerReleaseEvent>`                           | Output. `willClose`, `nextSnapPoint`. Directive already updated state.<br>**Default:** —                                                                                                                     |

`ForDrawerCloseReason`: `'escape' | 'backdrop' | 'pointerDownOutside' | 'focusOutside' | 'closeButton' | 'swipe' | 'programmatic'`.

> **Declarative vs. imperative naming asymmetry.** The declarative output is `(dismiss)`, but the imperative handle method stays `ForDrawerRef.close()`, the `[forDrawerClose]` directive selector is unchanged, and the `ForDrawerCloseReason` type keeps its name. This is intentional: the output rename removes the native-event collision (see [#814](https://github.com/tutkli/forty-cdk/issues/814)) while the imperative surface follows the convention established before that rename.

| Data attribute           | Values                                       |
| ------------------------ | -------------------------------------------- |
| `data-state`             | `open`                                       |
| `data-side`              | `top` \| `right` \| `bottom` \| `left`       |
| `data-active-snap-point` | the active snap point stringified, or absent |
| `data-dragging`          | present / absent                             |
| `data-scale-background`  | present / absent                             |
| `data-depth`             | `0` (root) \| `1` (first child) \| …         |
| `data-state-nested`      | `true` / absent                              |

### `ForDrawerBackdrop`

| Data attribute          | Values           |
| ----------------------- | ---------------- |
| `data-state`            | `open`           |
| `data-fade-from-active` | present / absent |
| `data-dragging`         | present / absent |

### `ForDrawerTrigger`

| Data attribute  | Values             |
| --------------- | ------------------ |
| `data-state`    | `open` \| `closed` |
| `data-disabled` | present / absent   |

### `ForDrawerClose`

| Data attribute | Values |
| -------------- | ------ |
| `data-state`   | `open` |

### `ForDrawerWrapper`

| Data attribute | Values             |
| -------------- | ------------------ |
| `data-state`   | `scaled` \| `idle` |

## Snap points

Three accepted shapes:

- `number ∈ [0, 1]` — fraction of the dismissal-axis dimension.
- `'NN%'` — equivalent to a fraction (`'50%' === 0.5`).
- `'NNpx'` — absolute pixel size measured from the anchored edge.

Pass them in **strictly increasing** order (closest-to-edge first). The directive throws `[forty-cdk/drawer] snapPoints must be strictly increasing (closest-to-edge first).` otherwise. `fadeFromIndex` must be a valid index into `snapPoints`.

```ts
[snapPoints] =
  "['148px', '50%', 1]"[activeSnapPoint] = // peek → mid → full
  'snap'[fadeFromIndex] = // current snap; written on drag release
    '1'; // backdrop fades once we cross the second snap
```

The `model<>()` change emitter (`(activeSnapPointChange)`) fires on internal transitions (the mount-time default and every drag release), and stays silent on consumer writes through `[(activeSnapPoint)]`.

### Positioning the snaps (CSS contract)

The directive does **not** position the surface at each snap — that is the consumer's job, keyed off `data-active-snap-point`. Position the rest state with a layout property such as `bottom` / `top` (or `left` / `right`), and transition it for the snap-to-snap animation.

The live drag delta is published on the host as the **`--for-drawer-translate`** custom property (a `"<x> <y>"` value, `"0px 0px"` at rest); apply it on the surface with `translate: var(--for-drawer-translate, 0px 0px)`. A custom property is used — rather than the directive writing `translate` / `transform` directly — for two reasons: `transform` is reserved for the scale-background / nested effect, and a directly-written inline `translate` is silently dropped by Angular when you also bind a template `[style.*]` on the same host. Reading it through the var keeps the drag working regardless of any inline style bindings you put on the surface, and composes with `transform` without clobbering it.

For a seamless release, transition **both** `translate` and your snap-position property with the same timing, and suppress that transition while `data-dragging` is present. The directive resets `--for-drawer-translate` to `"0px 0px"`, removes `data-dragging`, and updates `data-active-snap-point` in a single change-detection pass on release, so the drag delta animates back to zero in lockstep with the snap-position change — the surface never jumps to the previous rest position before sliding to the new snap.

```css
.sheet {
  /* The directive publishes the live drag delta here; compose it on the surface. */
  translate: var(--for-drawer-translate, 0px 0px);
}
.sheet[data-active-snap-point] {
  height: 80vh;
  transition:
    bottom 0.42s cubic-bezier(0.32, 0.72, 0, 1),
    translate 0.42s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet[data-active-snap-point][data-dragging] {
  transition: none; /* the drag follows the pointer 1:1 */
}
.sheet[data-active-snap-point='148px'] {
  bottom: calc(148px - 80vh);
}
.sheet[data-active-snap-point='0.5'] {
  bottom: -40vh;
}
.sheet[data-active-snap-point='1'] {
  bottom: 0;
}
```

### Backdrop drag-fade (CSS contract)

`[forDrawerBackdrop]` publishes the live drag progress _toward the anchored edge_ as the **`--for-drawer-drag-progress`** custom property (`0` at rest → `1` fully dragged off-screen) and mirrors the surface's **`data-dragging`** attribute. This drives the "backdrop fades out as you swipe to dismiss" cue with pure CSS — no `(dragMove)` listener required:

```css
.drawer-backdrop {
  /* Fades the backdrop as the surface is dragged off-screen. */
  opacity: calc(1 - var(--for-drawer-drag-progress, 0));
  transition: opacity 0.3s ease;
}
.drawer-backdrop[data-dragging] {
  transition: none; /* track the pointer 1:1 during the gesture */
}
```

`--for-drawer-drag-progress` only reflects the _dismiss_ direction: with snap points, a drag **away** from the edge (growing the surface) keeps it at `0`. On release it resets to `0` in the same change-detection pass that flips `data-dragging` off, so the backdrop animates back to full opacity in lockstep with the surface settling. The snap-driven `data-fade-from-active` cue (see above) is independent and can be combined or used on its own.

## Swipe-to-dismiss

- Pointer drag toward the anchored edge translates the surface and resolves to the nearest snap (or a dismiss) on release.
- With `snapPoints`, the drag is bidirectional: a drag **away** from the anchored edge grows the surface toward a larger snap (bounded by the largest snap), and a drag toward the edge shrinks it / dismisses past the lowest one. Without `snapPoints` the gesture is one-way (toward the edge to dismiss).
- `closeThreshold` (default `0.25`) is the fraction past which a release from the lowest snap dismisses — measured against that snap's own extent (not the full dimension), so a small "peek" snap stays dismissable without dragging it off-screen.
- `handleOnly: true` confines the gesture to a registered `[forDrawerHandle]`, leaving the rest of the surface free for content scroll.
- Gestures starting inside a scrollable element that hasn't reached its edge are NOT treated as swipes (the helper defers to inner scroll).
- **`prefers-reduced-motion: reduce`** disables the swipe listener entirely. Escape, backdrop, outside-pointer, and close button continue to work.

## Scale background

Opt in to the "viewport recedes behind the drawer" effect: when the drawer opens, the rest of the app shrinks slightly and rounds its corners to read as a layered surface. Two pieces required:

1. Apply `[forDrawerWrapper]` on the element that wraps the rest of the app (typically the root shell). Only one wrapper may be registered at a time.
2. Set `[scaleBackground]="true"` on the drawer that should drive the effect.

```html
<!-- Root shell -->
<div forDrawerWrapper>
  <header>…</header>
  <main>…</main>
</div>

<!-- Anywhere in the tree -->
@if (open()) {
<div
  forDrawer
  side="bottom"
  [scaleBackground]="true"
  (dismiss)="open.set(false)"
  animate.enter="slide-up"
  animate.leave="slide-down"
>
  …
</div>
}
```

While the effect is active the wrapper reflects `data-state="scaled"` (and `"idle"` at rest); the drawer reflects `data-scale-background` so consumers can style the surface differently when scale is in play (e.g. larger corner radii).

`setBackgroundColorOnScale` (default `true`) paints `<body>` with `scaleBackgroundColor` while the effect is active. Disable it (`[setBackgroundColorOnScale]="false"`) when the application shell already covers the viewport edge — a themed `<html>` / `<body>` background, a fixed root layer, or a full-bleed CSS-framework wrapper. In those flows the body-color mutation is redundant and would briefly overwrite a theme-managed value on every open / close; leaving it off keeps the consumer's own paint authoritative, the rounded gap behind the scaled wrapper composes with whatever colour they ship. The flag has no effect under `prefers-reduced-motion: reduce` (the whole effect is suppressed).

`prefers-reduced-motion: reduce` suppresses the effect entirely — wrapper styles, body color, and `data-scale-background` are all bypassed without affecting the rest of the drawer's behaviour.

Tune the magic numbers via `provideForDrawerDefaults` (`scaleAmount`, `scaleTranslateYpx`, `scaleBorderRadiusPx`, `scaleBackgroundColor`).

## Nested drawers

A drawer mounted inside another drawer's `@if` is automatically detected as a child and joins a LIFO stack — no `nested` flag required. The directive composes the existing dismissable-layer / focus / scroll-lock stacks (Escape closes the topmost first; focus stays trapped in the topmost; body scroll lock is refcounted so closing the child does not unlock the parent), and adds two visual hooks on the parent surface:

- **`data-state-nested="true"`** while at least one descendant is registered — useful for styling the parent differently when it is "covered" by a child.
- An inline `transform: scale(N) translate3d(...)` that scales the parent surface and translates it slightly away from its anchored edge, so the child reads as a layer in front. Suppressed under `prefers-reduced-motion: reduce`. Tune via `nestedScaleAmount` (default `0.93`) and `nestedTranslateYpx` (default `8`).

Each drawer also reflects its position in the stack as `data-depth` (`"0"` for the root, `"1"` for the first child, …).

```html
@if (parentOpen()) {
<div forDrawer side="bottom" (dismiss)="parentOpen.set(false)" animate.leave="slide-down">
  <h2 forDrawerTitle>Filters</h2>

  <button (click)="childOpen.set(true)">Date range</button>

  @if (childOpen()) {
  <div forDrawer side="bottom" (dismiss)="childOpen.set(false)" animate.leave="slide-down">
    <h2 forDrawerTitle>Date range</h2>
    …
  </div>
  }
</div>
}
```

Always nest the child's `@if` inside the parent's `@if`. That guarantees Angular's bottom-up destroy order tears the child down before the parent — the topology stack throws otherwise so the bug is loud at dev time. If both drawers opt into `[scaleBackground]="true"`, the wrapper effect composes with the parent's nested transform automatically.

## Defaults provider

```ts
import { provideForDrawerDefaults } from 'forty-cdk/drawer';

bootstrapApplication(App, {
  providers: [
    provideForDrawerDefaults({
      side: 'right',
      closeThreshold: 0.4,
      handleOnly: true,
      // Scale-background (opt-in per drawer; the keys below tune the visual)
      scaleAmount: 0.93,
      scaleTranslateYpx: 16,
      scaleBorderRadiusPx: 12,
      scaleBackgroundColor: '#000',
    }),
  ],
});
```

Per-component overrides nest:

```ts
@Component({
  providers: [provideForDrawerDefaults({ side: 'left' })],
  // ...
})
```

## Scoped / contained drawer

Pass `[container]` to portal the surface **and** the backdrop into a specific element instead of `document.body`. The supported shape is `[container]` paired with `[modal]="false"`.

```html
<section
  #listBox
  data-testid="container"
  style="position: relative; height: 400px; overflow: hidden;"
>
  <button forDrawerTrigger [(open)]="open">Open</button>

  @if (open()) {
  <div forDrawer side="right" [modal]="false" [container]="listBox" (dismiss)="open.set(false)">
    <div forDrawerBackdrop></div>
    <h2 forDrawerTitle>Filters</h2>
    <button forDrawerClose>Close</button>
  </div>
  }
</section>
```

**CSS contract.** The container must be positioned (`position: relative`); the surface and backdrop must use `position: absolute` (not `fixed`) so they are bounded to the container's box:

```css
section[data-testid='container'] {
  position: relative;
}
[forDrawer] {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  background: #fff;
}
[forDrawerBackdrop] {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}
```

**`[container]` + `[modal]="true"` — region-isolating modal.** When `modal` is `true` alongside `container`, the drawer isolates **within the container**:

- **Focus trap** stays scoped to the drawer surface (unchanged from non-contained modal mode).
- **Inert siblings** are applied to the container's other children only — body-level siblings outside the container stay fully interactive.
- **Scroll lock** targets the container's own `overflow`, not `<body>` — the rest of the page keeps scrolling.

```html
<section
  #listBox
  data-testid="container"
  style="position: relative; height: 400px; overflow: auto;"
>
  <button forDrawerTrigger [(open)]="open">Open</button>

  @if (open()) {
  <div forDrawer side="right" [modal]="true" [container]="listBox" (dismiss)="open.set(false)">
    <div forDrawerBackdrop></div>
    <h2 forDrawerTitle>Filters</h2>
    <button forDrawerClose>Close</button>
  </div>
  }
</section>
```

**Programmatic equivalent.** `ForDrawerManager.open(Cmp, { modal: true, container: boxEl })` portals both the surface and any `[forDrawerBackdrop]` inside the opened component into `boxEl` and scopes all three isolation behaviours to it.

**Swipe-to-dismiss and snap points** keep working inside a container — the math is dimension-based (`getBoundingClientRect`), not viewport-based.

**`scaleBackground` / nested visual transforms** assume a full-screen model and are not meaningful inside a container.

## Mount/unmount and animations

The directive deliberately does **not** apply `[hidden]` to its surface. Wrap with `@if (open())` and use Angular's native `animate.enter` / `animate.leave` for transitions. `data-state="open"` reflects the logical state for CSS hooks but is never tied to visibility — that is `@if`'s job.

```html
@if (open()) {
<div
  forDrawer
  side="bottom"
  (dismiss)="open.set(false)"
  animate.enter="slide-up"
  animate.leave="slide-down"
>
  …
</div>
}
```

## Accessibility

Implements the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). `role="dialog"` (or `"alertdialog"` when `alert`), `aria-modal="true"` in modal mode, `aria-labelledby` / `aria-describedby` auto-wired by `[forDrawerTitle]` / `[forDrawerDescription]`. Modal mode applies `inert` and `aria-hidden="true"` to body siblings so AT cannot reach them. The handle is `aria-hidden="true"` because keyboard users dismiss via Escape or `[forDrawerClose]`.

Keyboard: **Escape** closes the topmost drawer when `dismissible`; **Tab / Shift+Tab** cycles focus inside the drawer when `modal`; **Click** on `[forDrawerBackdrop]` closes when `dismissible`.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected `data-*` attributes listed per piece in the [API](#api) section.

> This is a modal overlay: the surface and backdrop portal to `document.body`. Style them with global CSS or classes — declaratively, add your class to the surface element (`<div forDrawer class="my-drawer">`); for drawers opened with `ForDrawerManager.open()`, pass `class` / `classList` on the open config so the tokens land on the real `[forDrawer]` host.

### CSS custom properties

| Property                     | Meaning                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--for-drawer-translate`     | Written on `[forDrawer]` (the surface). Live drag delta as a `"<x> <y>"` length pair (`"0px 0px"` at rest). Apply with `translate: var(--for-drawer-translate, 0px 0px)` so it composes with the consumer's `transform`. See [Positioning the snaps](#positioning-the-snaps-css-contract). |
| `--for-drawer-drag-progress` | Written on `[forDrawerBackdrop]`. Drag progress toward the anchored edge, `0` (at rest) → `1` (fully dragged off-screen). Fade with `opacity: calc(1 - var(--for-drawer-drag-progress, 0))`. See [Backdrop drag-fade](#backdrop-drag-fade-css-contract).                                   |

```css
.sheet[data-active-snap-point] {
  transition: translate 0.42s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet[data-dragging] {
  transition: none;
}
```
