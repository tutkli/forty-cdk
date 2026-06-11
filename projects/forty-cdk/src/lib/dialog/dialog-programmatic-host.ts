import { ChangeDetectionStrategy, Component, ViewContainerRef, viewChild } from '@angular/core';

import { ForDialog } from './dialog';

/**
 * Internal shell mounted by `ForDialogManager.open()` so that `[forDialog]`
 * runs as a real Angular host directive — focus trap, dismissable layer,
 * portal, scroll lock, inert siblings, return-focus and the modal-shell
 * triple-veto are all owned by the same code path as the declarative case.
 * The shell forwards every `ForDialog` input / output via the
 * `hostDirectives` mechanism so the manager can drive them with
 * `componentRef.setInput(...)` and read the directive instance back via
 * `componentRef.injector.get(ForDialog)`. The user component is then created
 * inside this shell's `ViewContainerRef`, which puts the user's element
 * injector beneath the wrapper's — so `[forDialogClose]`, `[forDialogTitle]`,
 * `[forDialogDescription]`, and `[forDialogBackdrop]` resolve
 * `FOR_DIALOG_CONTEXT` (provided by `ForDialog` via its directive
 * `providers`) without any extra wiring.
 *
 * Not exported from `public-api.ts`. Constructed exclusively by
 * `ForDialogManager`.
 */
@Component({
  // No selector — only constructed via `createComponent` inside the manager.
  template: '<ng-container #vc></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-for-dialog-host': '' },
  hostDirectives: [
    {
      directive: ForDialog,
      inputs: [
        'dismissible',
        'modal',
        'alert',
        'returnFocus',
        'initialFocus',
        'ariaLabel',
        'autoFocusOnOpen',
        'autoFocusOnClose',
      ],
      outputs: ['close', 'escapeKeyDown', 'pointerDownOutside', 'focusOutside', 'interactOutside'],
    },
  ],
})
export class ForDialogProgrammaticHost {
  /** Anchor where the user's component is rendered as a child view. */
  readonly vc = viewChild.required('vc', { read: ViewContainerRef });
}
