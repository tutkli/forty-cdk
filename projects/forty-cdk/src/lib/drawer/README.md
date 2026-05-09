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

```ts
import { Component, inject } from '@angular/core';
import { ForDrawerManager, ForDrawerRef, injectDrawerData } from 'forty-cdk';

@Component({
  template: `
    <p>{{ data.message }}</p>
    <button (click)="ref.close('cancel')">Cancel</button>
    <button (click)="ref.close('confirm')">Confirm</button>
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
      data: { message: 'Delete account?' },
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
| `autoFocusOnClose`| `(e: VetoableEvent) => void` \| `undefined` | —           | `event.preventDefault()` skips return-focus.                                |
| `swipeToDismiss`  | `boolean`                                   | `true`      | Disabled automatically under `prefers-reduced-motion: reduce`.              |
| `closeThreshold`  | `number`                                    | `0.25`      | Fraction of dimension past which a release dismisses.                       |
| `handleOnly`      | `boolean`                                   | `false`     | Swipe arms only on the registered `[forDrawerHandle]`.                      |
| `snapPoints`      | `ReadonlyArray<ForDrawerSnapPoint>`         | —           | `number ∈ [0,1]` \| `'NN%'` \| `'NNpx'`. Strictly increasing.               |
| `activeSnapPoint` | `ModelSignal<ForDrawerSnapPoint \| null>`   | `null`      | Two-way bindable. Initialised to `snapPoints[0]` on mount when null.        |
| `fadeFromIndex`   | `number`                                    | —           | Backdrop reflects `data-fade-from-active` once active >= this index.        |

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

The `model<>()` change emitter (`(activeSnapPointChange)`) fires only on internal transitions (drag release), not on consumer writes.

## Swipe-to-dismiss

- Pointer drag toward the anchored edge translates the surface and resolves to the nearest snap (or a dismiss) on release.
- `closeThreshold` (default `0.25`) is the Vaul-aligned fraction of dimension past which a release from the lowest snap dismisses.
- `handleOnly: true` confines the gesture to a registered `[forDrawerHandle]`, leaving the rest of the surface free for content scroll.
- Gestures starting inside a scrollable element that hasn't reached its edge are NOT treated as swipes (the helper defers to inner scroll).
- **`prefers-reduced-motion: reduce`** disables the swipe listener entirely. Escape, backdrop, outside-pointer, and close button continue to work.

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
