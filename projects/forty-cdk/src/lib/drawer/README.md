# Drawer

Headless side / bottom-sheet drawer with optional swipe-to-dismiss and Vaul-style snap points. Built on top of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — same focus trap, scroll lock, Escape-to-close, dismissable-layer, and portal behaviors as `ForDialog`, plus pointer-driven drag.

## Anatomy

| Piece                    | Selector                | Purpose                                                                                                       |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ForDrawer`              | `[forDrawer]`           | Root surface. `role="dialog"` (or `"alertdialog"`), `aria-modal`, side effects, swipe & snap engine.          |
| `ForDrawerTrigger`       | `[forDrawerTrigger]`    | Conveniently wires a `<button>` to the same `[(open)]` signal that gates the surrounding `@if`.               |
| `ForDrawerBackdrop`      | `[forDrawerBackdrop]`   | Optional overlay portaled to body. Reflects `data-fade-from-active` for snap-driven backdrop transitions.     |
| `ForDrawerHandle`        | `[forDrawerHandle]`     | Visual swipe handle. With `[handleOnly]="true"` the swipe gesture only arms on this element.                  |
| `ForDrawerTitle`         | `[forDrawerTitle]`      | Registers an id for `aria-labelledby`.                                                                        |
| `ForDrawerDescription`   | `[forDrawerDescription]`| Registers an id for `aria-describedby`.                                                                       |
| `ForDrawerClose`         | `[forDrawerClose]`      | Closes the drawer with reason `'closeButton'`.                                                                |
| `ForDrawerWrapper`       | `[forDrawerWrapper]`    | Marks the app shell so `[scaleBackground]` drawers can scale + translate it behind them.                      |

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

## ForDrawer inputs / models

| Name              | Type                                        | Default     | Notes                                                                       |
| ----------------- | ------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `side`            | `'top' \| 'right' \| 'bottom' \| 'left'`   | `'bottom'`  | Anchored edge. Drives swipe direction and `data-side`.                      |
| `modal`           | `boolean`                                   | `true`      | `aria-modal`, scroll lock, focus trap, inert siblings.                      |
| `dismissible`     | `boolean`                                   | `true`      | Whether Escape / backdrop / outside / swipe close.                          |
| `alert`           | `boolean`                                   | `false`     | `role="alertdialog"`.                                                       |
| `returnFocus`     | `boolean`                                   | `true`      | Restore focus on close.                                                     |
| `initialFocus`    | `'first' \| 'container'`                    | `'first'`   |                                                                             |
| `ariaLabel`       | `string \| null`                            | `null`      | Use when no visible title is rendered.                                      |
| `autoFocusOnOpen` | `(e: VetoableEvent) => void` \| `undefined` | —           | `event.preventDefault()` skips the imperative focus move.                   |
| `autoFocusOnClose`| `(e: VetoableEvent) => void` \| `undefined` | —           | Fires on every close path regardless of mode. In non-modal mode the directive doesn't move focus, so the veto is informational; in modal mode `event.preventDefault()` skips return-focus. |
| `swipeToDismiss`  | `boolean`                                   | `true`      | Disabled automatically under `prefers-reduced-motion: reduce`.              |
| `closeThreshold`  | `number`                                    | `0.25`      | Fraction of dimension past which a release dismisses.                       |
| `handleOnly`      | `boolean`                                   | `false`     | Swipe arms only on the registered `[forDrawerHandle]`.                      |
| `snapPoints`      | `ReadonlyArray<ForDrawerSnapPoint>`         | —           | `number ∈ [0,1]` \| `'NN%'` \| `'NNpx'`. Strictly increasing.               |
| `activeSnapPoint` | `ModelSignal<ForDrawerSnapPoint \| null>`   | `null`      | Two-way bindable. Initialised to `snapPoints[0]` on mount when null.        |
| `fadeFromIndex`   | `number`                                    | —           | Backdrop reflects `data-fade-from-active` once active >= this index.        |
| `scaleBackground` | `boolean`                                   | `false`     | Asks `[forDrawerWrapper]` to scale + translate behind the drawer.           |
| `setBackgroundColorOnScale` | `boolean`                         | `true`      | Paints `<body>` to mask the gap between scaled wrapper and viewport edge.   |

## ForDrawer outputs

| Name                  | Payload                                       | Notes                                                              |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `close`               | `ForDrawerCloseReason`                        | Wire to `(close)="open.set(false)"`.                               |
| `escapeKeyDown`       | `VetoableNativeEvent<KeyboardEvent>`          | `preventDefault()` suppresses auto-close.                          |
| `pointerDownOutside`  | `VetoableNativeEvent<PointerEvent>`           | "                                                                  |
| `focusOutside`        | `VetoableNativeEvent<FocusEvent>`             | "                                                                  |
| `interactOutside`     | `VetoableNativeEvent<PointerEvent \| FocusEvent>` | Composite — vetoed by either specific event.                       |
| `drag`                | `ForDrawerDragEvent`                          | Streams `percentageDragged` and the originating `PointerEvent`.    |
| `release`             | `ForDrawerReleaseEvent`                       | `willClose`, `nextSnapPoint`. Directive already updated state.     |

`ForDrawerCloseReason`: `'escape' | 'backdrop' | 'pointerDownOutside' | 'focusOutside' | 'closeButton' | 'swipe' | 'programmatic'`.

## Snap points

Three accepted shapes:

- `number ∈ [0, 1]` — fraction of the dismissal-axis dimension.
- `'NN%'` — equivalent to a fraction (`'50%' === 0.5`).
- `'NNpx'` — absolute pixel size measured from the anchored edge.

Pass them in **strictly increasing** order (closest-to-edge first). The directive throws `[forty-cdk/drawer] snapPoints must be strictly increasing (closest-to-edge first).` otherwise. `fadeFromIndex` must be a valid index into `snapPoints`.

```ts
[snapPoints]="['148px', '50%', 1]"   // peek → mid → full
[(activeSnapPoint)]="snap"           // current snap; written on drag release
[fadeFromIndex]="1"                  // backdrop fades once we cross the second snap
```

The `model<>()` change emitter (`(activeSnapPointChange)`) fires on internal transitions (the mount-time default and every drag release), and stays silent on consumer writes through `[(activeSnapPoint)]`.

## Swipe-to-dismiss

- Pointer drag toward the anchored edge translates the surface and resolves to the nearest snap (or a dismiss) on release.
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
  >…</div>
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
