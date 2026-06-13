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
import { ForDialog } from './dialog';

/**
 * @internal Minimal surface the outlet needs from `ForDialogManager` — avoids
 * a circular import between the outlet file and the manager file.
 */
export interface ForDialogOutletHost {
  readonly entries: Signal<readonly ForDialogEntry[]>;
  closeAllForDestroy(): void;
}

/**
 * @internal Shape of a single open dialog entry stored in the manager.
 */
export interface ForDialogEntry {
  readonly id: string;
  readonly component: Type<unknown>;
  readonly hostClass: string;
  readonly dismissible: boolean | undefined;
  readonly modal: boolean | undefined;
  readonly alert: boolean | undefined;
  readonly returnFocus: boolean | undefined;
  readonly initialFocus: 'first' | 'container' | undefined;
  readonly ariaLabel: string | undefined;
  readonly animateEnter: string | undefined;
  readonly autoFocusOnOpen: ((e: VetoableEvent) => void) | undefined;
  readonly autoFocusOnClose: ((e: VetoableEvent) => void) | undefined;
  readonly escapeKeyDown: ((e: VetoableNativeEvent<KeyboardEvent>) => void) | undefined;
  readonly pointerDownOutside: ((e: VetoableNativeEvent<PointerEvent>) => void) | undefined;
  readonly focusOutside: ((e: VetoableNativeEvent<FocusEvent>) => void) | undefined;
  readonly interactOutside:
    | ((e: VetoableNativeEvent<PointerEvent | FocusEvent>) => void)
    | undefined;
  handleClose(value: unknown): void;
  injectorFor(parent: Injector): Injector;
}

/**
 * @internal Exposes the element injector at a child of the row's `[forDialog]`
 * element so the user component rendered via `NgComponentOutlet` resolves
 * `FOR_DIALOG_CONTEXT` from the enclosing `[forDialog]` host.
 *
 * Mirrors `ForToastOutlet` — sits inside the `[forDialog]` element, so its
 * own element injector already resolves `FOR_DIALOG_CONTEXT`. The outlet feeds
 * that injector to `entry.injectorFor(ctx.injector)`, making the user
 * component's injector inherit `FOR_DIALOG_CONTEXT` alongside `FOR_DIALOG_DATA`
 * / `ForDialogRef` / consumer providers — so `[forDialogClose]`,
 * `[forDialogTitle]`, `[forDialogDescription]`, `[forDialogBackdrop]`, and
 * `inject(ForDialogRef)` / `injectDialogData()` all resolve exactly as in the
 * declarative path.
 */
@Directive({
  selector: '[forDialogContextInjector]',
  exportAs: 'forDialogContextInjector',
})
export class ForDialogContextInjector {
  readonly injector = inject(Injector);
}

/**
 * @internal Outlet component created once by `ForDialogManager` on the first
 * `open()` call. Renders every live entry from the manager's entries signal
 * with `@for`, so Angular's control-flow unmount triggers `animate.leave` on
 * close — identical to the declarative `@if (open()) { <div forDialog …> }` path.
 *
 * Constructed exclusively by `ForDialogManager`. Not exported from
 * `public-api.ts`.
 */
@Component({
  selector: 'for-dialog-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialog, NgComponentOutlet, ForDialogContextInjector],
  template: `
    @for (entry of entries(); track entry.id) {
      <div
        forDialog
        [attr.data-for-dialog-id]="entry.id"
        [animate.enter]="entry.animateEnter ?? ''"
        [class]="entry.hostClass"
        [dismissible]="entry.dismissible ?? true"
        [modal]="entry.modal ?? true"
        [alert]="entry.alert ?? false"
        [returnFocus]="entry.returnFocus ?? true"
        [initialFocus]="entry.initialFocus ?? 'first'"
        [ariaLabel]="entry.ariaLabel ?? null"
        [autoFocusOnOpen]="entry.autoFocusOnOpen"
        [autoFocusOnClose]="entry.autoFocusOnClose"
        (close)="entry.handleClose(fd.lastCloseValue())"
        (escapeKeyDown)="entry.escapeKeyDown?.($event)"
        (pointerDownOutside)="entry.pointerDownOutside?.($event)"
        (focusOutside)="entry.focusOutside?.($event)"
        (interactOutside)="entry.interactOutside?.($event)"
        #fd="forDialog"
      >
        <ng-container forDialogContextInjector #ctx="forDialogContextInjector">
          <ng-container
            [ngComponentOutlet]="entry.component"
            [ngComponentOutletInjector]="entry.injectorFor(ctx.injector)"
          />
        </ng-container>
      </div>
    }
  `,
})
export class ForDialogOutlet {
  readonly #destroyRef = inject(DestroyRef);
  #host: ForDialogOutletHost | null = null;

  /**
   * @internal Called once by `ForDialogManager` right after creating this
   * outlet to wire the reactive entries accessor and the destroy hook.
   */
  init(host: ForDialogOutletHost): void {
    this.#host = host;
    this.#destroyRef.onDestroy(() => host.closeAllForDestroy());
  }

  entries(): readonly ForDialogEntry[] {
    return this.#host?.entries() ?? [];
  }
}
