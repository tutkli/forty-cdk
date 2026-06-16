import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  inject,
  Injector,
  type Signal,
  type Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import type {
  VetoableEvent,
  VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { ForDrawer } from './drawer';
import type {
  ForDrawerDragEvent,
  ForDrawerReleaseEvent,
  ForDrawerSide,
  ForDrawerSnapPoint,
} from './drawer-context';

/**
 * @internal Minimal surface the outlet needs from `ForDrawerManager` — avoids
 * a circular import between the outlet file and the manager file.
 */
export interface ForDrawerOutletHost {
  readonly entries: Signal<readonly ForDrawerEntry[]>;
  closeAllForDestroy(): void;
}

/**
 * @internal Shape of a single open drawer entry stored in the manager.
 */
export interface ForDrawerEntry {
  readonly id: string;
  readonly component: Type<unknown>;
  readonly hostClass: string;
  readonly side: ForDrawerSide | undefined;
  readonly dismissible: boolean | undefined;
  readonly modal: boolean | undefined;
  readonly alert: boolean | undefined;
  readonly returnFocus: boolean | undefined;
  readonly initialFocus: 'first' | 'container' | undefined;
  readonly ariaLabel: string | undefined;
  readonly container: HTMLElement | null | undefined;
  readonly animateEnter: string | undefined;
  readonly autoFocusOnOpen: ((e: VetoableEvent) => void) | undefined;
  readonly autoFocusOnClose: ((e: VetoableEvent) => void) | undefined;
  readonly swipeToDismiss: boolean | undefined;
  readonly closeThreshold: number | undefined;
  readonly handleOnly: boolean | undefined;
  readonly scaleBackground: boolean | undefined;
  readonly setBackgroundColorOnScale: boolean | undefined;
  readonly snapPoints: ReadonlyArray<ForDrawerSnapPoint> | undefined;
  readonly activeSnapPoint: ForDrawerSnapPoint | undefined;
  readonly fadeFromIndex: number | undefined;
  readonly escapeKeyDown: ((e: VetoableNativeEvent<KeyboardEvent>) => void) | undefined;
  readonly pointerDownOutside: ((e: VetoableNativeEvent<PointerEvent>) => void) | undefined;
  readonly focusOutside: ((e: VetoableNativeEvent<FocusEvent>) => void) | undefined;
  readonly interactOutside:
    | ((e: VetoableNativeEvent<PointerEvent | FocusEvent>) => void)
    | undefined;
  readonly onDrag: ((e: ForDrawerDragEvent) => void) | undefined;
  readonly onRelease: ((e: ForDrawerReleaseEvent) => void) | undefined;
  readonly onActiveSnapPointChange: ((snap: ForDrawerSnapPoint | null) => void) | undefined;
  handleClose(value: unknown): void;
  injectorFor(parent: Injector): Injector;
}

/**
 * @internal Exposes the element injector at a child of the row's `[forDrawer]`
 * element so the user component rendered via `NgComponentOutlet` resolves
 * `FOR_DRAWER_CONTEXT` from the enclosing `[forDrawer]` host.
 *
 * Mirrors `ForToastOutlet` — sits inside the `[forDrawer]` element, so its
 * own element injector already resolves `FOR_DRAWER_CONTEXT`. The outlet feeds
 * that injector to `entry.injectorFor(ctx.injector)`, making the user
 * component's injector inherit `FOR_DRAWER_CONTEXT` alongside `FOR_DRAWER_DATA`
 * / `ForDrawerRef` / consumer providers — so `[forDrawerClose]`,
 * `[forDrawerTitle]`, `[forDrawerDescription]`, `[forDrawerBackdrop]`,
 * `[forDrawerHandle]`, and `inject(ForDrawerRef)` / `injectDrawerData()` all
 * resolve exactly as in the declarative path.
 */
@Directive({
  selector: '[forDrawerContextInjector]',
  exportAs: 'forDrawerContextInjector',
})
export class ForDrawerContextInjector {
  readonly injector = inject(Injector);
}

/**
 * @internal Outlet component created once by `ForDrawerManager` on the first
 * `open()` call. Renders every live entry from the manager's entries signal
 * with `@for`, so Angular's control-flow unmount triggers `animate.leave` on
 * close — identical to the declarative `@if (open()) { <div forDrawer …> }` path.
 *
 * Constructed exclusively by `ForDrawerManager`. Not exported from
 * `public-api.ts`.
 */
@Component({
  selector: 'for-drawer-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDrawer, NgComponentOutlet, ForDrawerContextInjector],
  template: `
    @for (entry of entries(); track entry.id) {
      <div
        forDrawer
        [attr.data-for-drawer-id]="entry.id"
        [animate.enter]="entry.animateEnter ?? ''"
        [class]="entry.hostClass"
        [side]="entry.side ?? 'bottom'"
        [dismissible]="entry.dismissible ?? true"
        [modal]="entry.modal ?? true"
        [alert]="entry.alert ?? false"
        [returnFocus]="entry.returnFocus ?? true"
        [initialFocus]="entry.initialFocus ?? 'first'"
        [ariaLabel]="entry.ariaLabel ?? null"
        [container]="entry.container ?? null"
        [autoFocusOnOpen]="entry.autoFocusOnOpen"
        [autoFocusOnClose]="entry.autoFocusOnClose"
        [swipeToDismiss]="entry.swipeToDismiss ?? true"
        [closeThreshold]="entry.closeThreshold ?? 0.25"
        [handleOnly]="entry.handleOnly ?? false"
        [scaleBackground]="entry.scaleBackground ?? false"
        [setBackgroundColorOnScale]="entry.setBackgroundColorOnScale ?? true"
        [snapPoints]="entry.snapPoints"
        [activeSnapPoint]="entry.activeSnapPoint ?? null"
        [fadeFromIndex]="entry.fadeFromIndex"
        (close)="entry.handleClose(fd.lastCloseValue())"
        (escapeKeyDown)="entry.escapeKeyDown?.($event)"
        (pointerDownOutside)="entry.pointerDownOutside?.($event)"
        (focusOutside)="entry.focusOutside?.($event)"
        (interactOutside)="entry.interactOutside?.($event)"
        (drag)="entry.onDrag?.($event)"
        (release)="entry.onRelease?.($event)"
        (activeSnapPointChange)="entry.onActiveSnapPointChange?.($event)"
        #fd="forDrawer"
      >
        <ng-container forDrawerContextInjector #ctx="forDrawerContextInjector">
          <ng-container
            [ngComponentOutlet]="entry.component"
            [ngComponentOutletInjector]="entry.injectorFor(ctx.injector)"
          />
        </ng-container>
      </div>
    }
  `,
})
export class ForDrawerOutlet {
  readonly #destroyRef = inject(DestroyRef);
  #host: ForDrawerOutletHost | null = null;

  /**
   * @internal Called once by `ForDrawerManager` right after creating this
   * outlet to wire the reactive entries accessor and the destroy hook.
   */
  init(host: ForDrawerOutletHost): void {
    this.#host = host;
    this.#destroyRef.onDestroy(() => host.closeAllForDestroy());
  }

  entries(): readonly ForDrawerEntry[] {
    return this.#host?.entries() ?? [];
  }
}
