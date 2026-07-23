import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  Injector,
  inject,
  type Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import {
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { ForDialog } from './dialog';
import type { ForDialogCloseReason } from './dialog-context';

/**
 * @internal Minimal surface the outlet needs from `ForDialogManager` — avoids
 * a circular import between the outlet file and the manager file.
 */
export type ForDialogOutletHost = OverlayManagerOutletHost<ForDialogEntry>;

/**
 * Shape of a single open dialog entry stored in the manager.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export interface ForDialogEntry extends OverlayManagerEntry {
  readonly component: Type<unknown>;
  readonly hostClass: string;
  readonly dismissible: boolean | undefined;
  readonly modal: boolean | undefined;
  readonly alert: boolean | undefined;
  readonly returnFocus: boolean | undefined;
  readonly returnFocusTarget: HTMLElement | null | undefined;
  readonly initialFocus: 'first' | 'container' | undefined;
  readonly ariaLabel: string | undefined;
  readonly container: HTMLElement | null | undefined;
  readonly animateEnter: string | undefined;
  readonly autoFocusOnOpen: ((e: VetoableEvent) => void) | undefined;
  readonly autoFocusOnClose: ((e: VetoableEvent) => void) | undefined;
  readonly escapeKeyDown: ((e: VetoableNativeEvent<KeyboardEvent>) => void) | undefined;
  readonly pointerDownOutside: ((e: VetoableNativeEvent<PointerEvent>) => void) | undefined;
  readonly focusOutside: ((e: VetoableNativeEvent<FocusEvent>) => void) | undefined;
  readonly interactOutside:
    | ((e: VetoableNativeEvent<PointerEvent | FocusEvent>) => void)
    | undefined;
  handleClose(reason: ForDialogCloseReason, value: unknown): void;
  injectorFor(parent: Injector): Injector;
}

/**
 * @internal Exposes the element injector at a child of the row's `[forDialog]`
 * element so the user component rendered via `NgComponentOutlet` resolves
 * `FOR_DIALOG_CONTEXT` from the enclosing `[forDialog]` host.
 */
@Directive({
  selector: '[forDialogContextInjector]',
  exportAs: 'forDialogContextInjector',
})
export class ForDialogContextInjector {
  /**
   * Element injector at a child of the row's `[forDialog]` element, which
   * already resolves `FOR_DIALOG_CONTEXT`. The outlet feeds this injector to
   * `entry.injectorFor(ctx.injector)`, making the user component rendered via
   * `NgComponentOutlet` inherit the context alongside the data token / ref /
   * consumer providers — so every piece (`[forDialogClose]`,
   * `[forDialogTitle]`, …) resolves exactly as in the declarative path.
   */
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
        [returnFocusTarget]="entry.returnFocusTarget ?? null"
        [initialFocus]="entry.initialFocus ?? 'first'"
        [ariaLabel]="entry.ariaLabel ?? null"
        [container]="entry.container ?? null"
        [autoFocusOnOpen]="entry.autoFocusOnOpen"
        [autoFocusOnClose]="entry.autoFocusOnClose"
        (dismiss)="entry.handleClose($event, fd.lastCloseValue())"
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
export class ForDialogOutlet implements OverlayManagerOutlet<ForDialogEntry> {
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
