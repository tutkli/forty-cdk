import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  inject,
  input,
  type Signal,
  type Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import {
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
  type OverlaySurface,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { ForDrawer } from './drawer';
import type {
  ForDrawerCloseReason,
  ForDrawerSide,
  ForDrawerSnapPoint,
  ForDrawerSwipeEndEvent,
  ForDrawerSwipeEvent,
} from './drawer-context';

/**
 * @internal Minimal surface the outlet needs from `ForDrawerManager` — avoids
 * a circular import between the outlet file and the manager file.
 */
export type ForDrawerOutletHost = OverlayManagerOutletHost<ForDrawerEntry>;

/**
 * Shape of a single open drawer entry stored in the manager.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface ForDrawerEntry extends OverlayManagerEntry {
  readonly component: Type<unknown>;
  readonly hostClass: string;
  readonly side: ForDrawerSide;
  readonly dismissible: boolean;
  readonly modal: boolean;
  readonly alert: boolean | undefined;
  readonly returnFocus: boolean;
  readonly returnFocusTarget: HTMLElement | null | undefined;
  readonly initialFocus: 'first' | 'container';
  readonly ariaLabel: string | undefined;
  readonly container: HTMLElement | null | undefined;
  readonly animateEnter: string | undefined;
  readonly autoFocusOnOpen: ((e: VetoableEvent) => void) | undefined;
  readonly autoFocusOnClose: ((e: VetoableEvent) => void) | undefined;
  readonly swipeToDismiss: boolean;
  readonly closeThreshold: number;
  readonly handleOnly: boolean;
  readonly scaleBackground: boolean;
  readonly setBackgroundColorOnScale: boolean;
  readonly snapPoints: ReadonlyArray<ForDrawerSnapPoint> | undefined;
  readonly activeSnapPoint: Signal<ForDrawerSnapPoint | null>;
  readonly fadeFromIndex: number | undefined;
  readonly escapeKeyDown: ((e: VetoableNativeEvent<KeyboardEvent>) => void) | undefined;
  readonly pointerDownOutside: ((e: VetoableNativeEvent<PointerEvent>) => void) | undefined;
  readonly focusOutside: ((e: VetoableNativeEvent<FocusEvent>) => void) | undefined;
  readonly interactOutside:
    | ((e: VetoableNativeEvent<PointerEvent | FocusEvent>) => void)
    | undefined;
  readonly swipeStart: ((e: ForDrawerSwipeEvent) => void) | undefined;
  readonly swipeMove: ((e: ForDrawerSwipeEvent) => void) | undefined;
  readonly swipeEnd: ((e: ForDrawerSwipeEndEvent) => void) | undefined;
  readonly swipeCancel: ((e: ForDrawerSwipeEvent) => void) | undefined;
  handleClose(reason: ForDrawerCloseReason, value: unknown): void;
  onActiveSnapPointChange(snap: ForDrawerSnapPoint | null): void;
  injectorFor(parent: Injector): Injector;
}

/**
 * @internal Exposes the element injector at a child of the row's `[forDrawer]`
 * element so the user component rendered via `NgComponentOutlet` resolves
 * `FOR_DRAWER_CONTEXT` from the enclosing `[forDrawer]` host.
 */
@Directive({
  selector: '[forDrawerContextInjector]',
  exportAs: 'forDrawerContextInjector',
})
export class ForDrawerContextInjector {
  /**
   * Element injector at a child of the row's `[forDrawer]` element, which
   * already resolves `FOR_DRAWER_CONTEXT`. The outlet feeds this injector to
   * `entry.injectorFor(ctx.injector)`, making the user component rendered via
   * `NgComponentOutlet` inherit the context alongside the data token / ref /
   * consumer providers — so every piece (`[forDrawerClose]`,
   * `[forDrawerTitle]`, …) resolves exactly as in the declarative path.
   */
  readonly injector = inject(Injector);
}

/**
 * @internal Per-row registrar that stores each rendered drawer's exit-animation
 * surface with the shared overlay core at attach time, so
 * `OverlayManagerCore.beginLeave` drives the leave classes by direct reference
 * instead of re-querying the document on every close. Applied on the same
 * `<div forDrawer>` the outlet stamps; registers in `afterNextRender`, so it
 * also runs for a drawer whose mount was deferred to a later render (e.g. opened
 * from inside `effect()`).
 *
 * Declared before `ForDrawerOutlet` so the component's `imports` can reference
 * it. Not exported from `public-api.ts`.
 */
@Directive({ selector: '[forDrawerSurface]' })
export class ForDrawerSurface {
  /** Per-instance drawer id this surface is keyed under. */
  readonly id = input.required<string>({ alias: 'forDrawerSurface' });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #drawer = inject(ForDrawer);
  readonly #outlet = inject(ForDrawerOutlet);

  constructor() {
    afterNextRender(() => {
      this.#outlet.registerSurface(this.id(), {
        host: this.#host.nativeElement,
        backdrop: () => this.#drawer.backdropElement(),
      });
    });
  }
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
  imports: [ForDrawer, NgComponentOutlet, ForDrawerContextInjector, ForDrawerSurface],
  template: `
    @for (entry of entries(); track entry.id) {
      <div
        forDrawer
        [forDrawerSurface]="entry.id"
        [attr.data-for-drawer-id]="entry.id"
        [animate.enter]="entry.animateEnter ?? ''"
        [class]="entry.hostClass"
        [side]="entry.side"
        [dismissible]="entry.dismissible"
        [modal]="entry.modal"
        [alert]="entry.alert ?? false"
        [returnFocus]="entry.returnFocus"
        [returnFocusTarget]="entry.returnFocusTarget ?? null"
        [initialFocus]="entry.initialFocus"
        [ariaLabel]="entry.ariaLabel ?? null"
        [container]="entry.container ?? null"
        [autoFocusOnOpen]="entry.autoFocusOnOpen"
        [autoFocusOnClose]="entry.autoFocusOnClose"
        [swipeToDismiss]="entry.swipeToDismiss"
        [closeThreshold]="entry.closeThreshold"
        [handleOnly]="entry.handleOnly"
        [scaleBackground]="entry.scaleBackground"
        [setBackgroundColorOnScale]="entry.setBackgroundColorOnScale"
        [snapPoints]="entry.snapPoints"
        [activeSnapPoint]="entry.activeSnapPoint()"
        [fadeFromIndex]="entry.fadeFromIndex"
        (dismiss)="entry.handleClose($event, fd.lastCloseValue())"
        (escapeKeyDown)="entry.escapeKeyDown?.($event)"
        (pointerDownOutside)="entry.pointerDownOutside?.($event)"
        (focusOutside)="entry.focusOutside?.($event)"
        (interactOutside)="entry.interactOutside?.($event)"
        (swipeStart)="entry.swipeStart?.($event)"
        (swipeMove)="entry.swipeMove?.($event)"
        (swipeEnd)="entry.swipeEnd?.($event)"
        (swipeCancel)="entry.swipeCancel?.($event)"
        (activeSnapPointChange)="entry.onActiveSnapPointChange($event)"
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
export class ForDrawerOutlet implements OverlayManagerOutlet<ForDrawerEntry> {
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

  /**
   * @internal Forwards a per-row surface registration from `ForDrawerSurface`
   * to the manager core.
   */
  registerSurface(id: string, surface: OverlaySurface): void {
    this.#host?.registerSurface(id, surface);
  }
}
