# Drawer

Headless side / bottom-sheet drawer with optional swipe-to-dismiss and Vaul-style snap points. Built on top of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — same focus trap, scroll lock, Escape-to-close, dismissable-layer, and portal behaviors as `ForDialog`, plus pointer-driven drag.

## Anatomy

| Piece                  | Selector                 | Purpose                                                                                                                                                                        |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForDrawer`            | `[forDrawer]`            | Root surface. `role="dialog"` (or `"alertdialog"`), `aria-modal`, side effects, swipe & snap engine.                                                                           |
| `ForDrawerTrigger`     | `[forDrawerTrigger]`     | Conveniently wires a `<button>` to the same `[(open)]` signal that gates the surrounding `@if`.                                                                                |
| `ForDrawerBackdrop`    | `[forDrawerBackdrop]`    | Optional overlay portaled to body. Reflects `data-fade-from-active` (snap-driven) + `data-dragging`, and publishes `--for-drawer-drag-progress` for the swipe-to-dismiss fade. |
| `ForDrawerHandle`      | `[forDrawerHandle]`      | Visual swipe handle. With `[handleOnly]="true"` the swipe gesture only arms on this element.                                                                                   |
| `ForDrawerTitle`       | `[forDrawerTitle]`       | Registers an id for `aria-labelledby`.                                                                                                                                         |
| `ForDrawerDescription` | `[forDrawerDescription]` | Registers an id for `aria-describedby`.                                                                                                                                        |
| `ForDrawerClose`       | `[forDrawerClose]`       | Closes the drawer with reason `'closeButton'`.                                                                                                                                 |
| `ForDrawerWrapper`     | `[forDrawerWrapper]`     | Marks the app shell so `[scaleBackground]` drawers can scale + translate it behind them.                                                                                       |

## Two flows, one engine

Same engine as Dialog: the directive composes focus trap + scroll lock + dismissable layer + portal + (additionally) swipe-dismiss. Pick declarative or programmatic.

### Declarative — `[forDrawer]`

Mount equals open. The consumer's signal drives `@if`; the directive emits `(close)` when it wants to be unmounted.

```ts
import { Component, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerTitle,
  ForDrawerTrigger,
  type ForDrawerSnapPoint,
} from 'forty-cdk';

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
        (close)="open.set(false)"
        animate.enter="slide-up"
        animate.leave="slide-down"
      >
        <div forDrawerBackdrop animate.enter="fade-in" animate.leave="fade-out"></div>
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
} from 'forty-cdk';

@Component({
  imports: [
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <div forDrawerBackdrop animate.enter="fade-in" animate.leave="fade-out"></div>
    <div forDrawerHandle aria-hidden="true"></div>
    <h2 forDrawerTitle>Delete account?</h2>
    <p forDrawerDescription>{{ data.message }}</p>
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
    const result = await ref.closed;
    if (result === 'confirm') {
      // ...
    }
  }
}
```

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

`class` is a single or space-separated string; `classList` is an array or space-separated string; both merge and de-dup and never clobber the host attributes. This replaces the old `inject(FOR_DRAWER_CONTEXT).hostElement.classList.add('my-drawer')` workaround.

## ForDrawer inputs / models

| Name                        | Type                                        | Default    | Notes                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `side`                      | `'top' \| 'right' \| 'bottom' \| 'left'`    | `'bottom'` | Anchored edge. Drives swipe direction and `data-side`.                                                                                                                                     |
| `modal`                     | `boolean`                                   | `true`     | `aria-modal`, scroll lock, focus trap, inert siblings.                                                                                                                                     |
| `dismissible`               | `boolean`                                   | `true`     | Whether Escape / backdrop / outside / swipe close.                                                                                                                                         |
| `alert`                     | `boolean`                                   | `false`    | `role="alertdialog"`.                                                                                                                                                                      |
| `returnFocus`               | `boolean`                                   | `true`     | Restore focus on close.                                                                                                                                                                    |
| `initialFocus`              | `'first' \| 'container'`                    | `'first'`  |                                                                                                                                                                                            |
| `ariaLabel`                 | `string \| null`                            | `null`     | Use when no visible title is rendered.                                                                                                                                                     |
| `autoFocusOnOpen`           | `(e: VetoableEvent) => void` \| `undefined` | —          | `event.preventDefault()` skips the imperative focus move.                                                                                                                                  |
| `autoFocusOnClose`          | `(e: VetoableEvent) => void` \| `undefined` | —          | Fires on every close path regardless of mode. In non-modal mode the directive doesn't move focus, so the veto is informational; in modal mode `event.preventDefault()` skips return-focus. |
| `swipeToDismiss`            | `boolean`                                   | `true`     | Disabled automatically under `prefers-reduced-motion: reduce`.                                                                                                                             |
| `closeThreshold`            | `number`                                    | `0.25`     | Fraction of dimension past which a release dismisses.                                                                                                                                      |
| `handleOnly`                | `boolean`                                   | `false`    | Swipe arms only on the registered `[forDrawerHandle]`.                                                                                                                                     |
| `snapPoints`                | `ReadonlyArray<ForDrawerSnapPoint>`         | —          | `number ∈ [0,1]` \| `'NN%'` \| `'NNpx'`. Strictly increasing.                                                                                                                              |
| `activeSnapPoint`           | `ModelSignal<ForDrawerSnapPoint \| null>`   | `null`     | Two-way bindable. Initialised to `snapPoints[0]` on mount when null.                                                                                                                       |
| `fadeFromIndex`             | `number`                                    | —          | Backdrop reflects `data-fade-from-active` once active >= this index.                                                                                                                       |
| `scaleBackground`           | `boolean`                                   | `false`    | Asks `[forDrawerWrapper]` to scale + translate behind the drawer.                                                                                                                          |
| `setBackgroundColorOnScale` | `boolean`                                   | `true`     | Paints `<body>` to mask the gap between scaled wrapper and viewport edge.                                                                                                                  |

## ForDrawer outputs

| Name                 | Payload                                           | Notes                                                           |
| -------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `close`              | `ForDrawerCloseReason`                            | Wire to `(close)="open.set(false)"`.                            |
| `escapeKeyDown`      | `VetoableNativeEvent<KeyboardEvent>`              | `preventDefault()` suppresses auto-close.                       |
| `pointerDownOutside` | `VetoableNativeEvent<PointerEvent>`               | "                                                               |
| `focusOutside`       | `VetoableNativeEvent<FocusEvent>`                 | "                                                               |
| `interactOutside`    | `VetoableNativeEvent<PointerEvent \| FocusEvent>` | Composite — vetoed by either specific event.                    |
| `drag`               | `ForDrawerDragEvent`                              | Streams `percentageDragged` and the originating `PointerEvent`. |
| `release`            | `ForDrawerReleaseEvent`                           | `willClose`, `nextSnapPoint`. Directive already updated state.  |

`ForDrawerCloseReason`: `'escape' | 'backdrop' | 'pointerDownOutside' | 'focusOutside' | 'closeButton' | 'swipe' | 'programmatic'`.

## CSS custom properties

| Element              | Custom property             | Type / range                    | Meaning                                                                                                                              |
| -------------------- | --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `[forDrawer]` (surface) | `--for-drawer-translate`    | `"<x> <y>"` length pair (`"0px 0px"` at rest) | Live drag delta. Apply with `translate: var(--for-drawer-translate, 0px 0px)` so it composes with the consumer's `transform`. See [Positioning the snaps](#positioning-the-snaps-css-contract). |
| `[forDrawerBackdrop]`   | `--for-drawer-drag-progress` | number `0`–`1` (`0` at rest)    | Drag progress toward the anchored edge (`1` = fully dragged off-screen). Fade with `opacity: calc(1 - var(--for-drawer-drag-progress, 0))`. See [Backdrop drag-fade](#backdrop-drag-fade-css-contract). |

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

`[forDrawerBackdrop]` publishes the live drag progress _toward the anchored edge_ as the **`--for-drawer-drag-progress`** custom property (`0` at rest → `1` fully dragged off-screen) and mirrors the surface's **`data-dragging`** attribute. This drives the Vaul-style "backdrop fades out as you swipe to dismiss" cue with pure CSS — no `(drag)` listener required:

```css
[forDrawerBackdrop] {
  /* Fades the backdrop as the surface is dragged off-screen. */
  opacity: calc(1 - var(--for-drawer-drag-progress, 0));
  transition: opacity 0.3s ease;
}
[forDrawerBackdrop][data-dragging] {
  transition: none; /* track the pointer 1:1 during the gesture */
}
```

`--for-drawer-drag-progress` only reflects the _dismiss_ direction: with snap points, a drag **away** from the edge (growing the surface) keeps it at `0`. On release it resets to `0` in the same change-detection pass that flips `data-dragging` off, so the backdrop animates back to full opacity in lockstep with the surface settling. The snap-driven `data-fade-from-active` cue (see above) is independent and can be combined or used on its own.

## Swipe-to-dismiss

- Pointer drag toward the anchored edge translates the surface and resolves to the nearest snap (or a dismiss) on release.
- With `snapPoints`, the drag is bidirectional: a drag **away** from the anchored edge grows the surface toward a larger snap (bounded by the largest snap), and a drag toward the edge shrinks it / dismisses past the lowest one. Without `snapPoints` the gesture is one-way (toward the edge to dismiss).
- `closeThreshold` (default `0.25`) is the Vaul-aligned fraction of dimension past which a release from the lowest snap dismisses.
- `handleOnly: true` confines the gesture to a registered `[forDrawerHandle]`, leaving the rest of the surface free for content scroll.
- Gestures starting inside a scrollable element that hasn't reached its edge are NOT treated as swipes (the helper defers to inner scroll).
- **`prefers-reduced-motion: reduce`** disables the swipe listener entirely. Escape, backdrop, outside-pointer, and close button continue to work.

## Scale background (Vaul `shouldScaleBackground`)

Opt in to the "viewport recedes behind the drawer" effect popularised by Vaul: when the drawer opens, the rest of the app shrinks slightly and rounds its corners to read as a layered surface. Two pieces required:

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
  (close)="open.set(false)"
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
<div forDrawer side="bottom" (close)="parentOpen.set(false)" animate.leave="slide-down">
  <h2 forDrawerTitle>Filters</h2>

  <button (click)="childOpen.set(true)">Date range</button>

  @if (childOpen()) {
  <div forDrawer side="bottom" (close)="childOpen.set(false)" animate.leave="slide-down">
    <h2 forDrawerTitle>Date range</h2>
    …
  </div>
  }
</div>
}
```

Always nest the child's `@if` inside the parent's `@if`. That guarantees Angular's bottom-up destroy order tears the child down before the parent — the topology stack throws otherwise so the bug is loud at dev time. If both drawers opt into `[scaleBackground]="true"`, the wrapper effect composes with the parent's nested transform automatically.

## Accessibility

Implements the WAI-ARIA Modal Dialog pattern. `role="dialog"` (or `"alertdialog"` when `alert`), `aria-modal="true"` in modal mode, `aria-labelledby` / `aria-describedby` auto-wired by `[forDrawerTitle]` / `[forDrawerDescription]`. Modal mode applies `inert` and `aria-hidden="true"` to body siblings so AT cannot reach them. The handle is `aria-hidden="true"` because keyboard users dismiss via Escape or `[forDrawerClose]`.

## Defaults provider

```ts
import { provideForDrawerDefaults } from 'forty-cdk';

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

## Mount/unmount and animations

The directive deliberately does **not** apply `[hidden]` to its surface. Wrap with `@if (open())` and use Angular's native `animate.enter` / `animate.leave` for transitions. `data-state="open"` reflects the logical state for CSS hooks but is never tied to visibility — that is `@if`'s job.

```html
@if (open()) {
<div
  forDrawer
  side="bottom"
  (close)="open.set(false)"
  animate.enter="slide-up"
  animate.leave="slide-down"
>
  …
</div>
}
```
