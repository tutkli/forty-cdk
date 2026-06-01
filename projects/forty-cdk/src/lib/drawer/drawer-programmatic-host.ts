import { ChangeDetectionStrategy, Component, ViewContainerRef, viewChild } from '@angular/core';

import { ForDrawer } from './drawer';

/**
 * Internal shell mounted by `ForDrawerManager.open()` so that `[forDrawer]`
 * runs as a real Angular host directive — focus trap, dismissable layer,
 * portal, swipe-dismiss, scale coordinator registration, snap-point
 * validation, and `ForDrawerStack` push are all owned by the same code path
 * as the declarative case. The shell forwards every `ForDrawer` input /
 * output via the `hostDirectives` mechanism so the manager can drive them
 * with `componentRef.setInput(...)` and read the directive instance back via
 * `componentRef.injector.get(ForDrawer)`. The user component is then created
 * inside this shell's `ViewContainerRef`, which puts the user's element
 * injector beneath the wrapper's — so `[forDrawerClose]`, `[forDrawerTitle]`,
 * `[forDrawerDescription]`, `[forDrawerBackdrop]`, and `[forDrawerHandle]`
 * resolve `FOR_DRAWER_CONTEXT` (provided by `ForDrawer` via its directive
 * `providers`) without any extra wiring.
 *
 * Not exported from `public-api.ts`. Constructed exclusively by
 * `ForDrawerManager`.
 */
@Component({
  // No selector — only constructed via `createComponent` inside the manager.
  template: '<ng-container #vc></ng-container>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-for-drawer-host': '' },
  hostDirectives: [
    {
      directive: ForDrawer,
      inputs: [
        'side',
        'dismissible',
        'modal',
        'alert',
        'returnFocus',
        'initialFocus',
        'ariaLabel',
        'autoFocusOnOpen',
        'autoFocusOnClose',
        'swipeToDismiss',
        'closeThreshold',
        'handleOnly',
        'scaleBackground',
        'setBackgroundColorOnScale',
        'snapPoints',
        'activeSnapPoint',
        'fadeFromIndex',
      ],
      outputs: [
        'close',
        'escapeKeyDown',
        'pointerDownOutside',
        'focusOutside',
        'interactOutside',
        'drag',
        'release',
        'activeSnapPointChange',
      ],
    },
  ],
})
export class ForDrawerProgrammaticHost {
  /** Anchor where the user's component is rendered as a child view. */
  readonly vc = viewChild.required('vc', { read: ViewContainerRef });
}
