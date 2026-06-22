import type { DestroyRef } from '@angular/core';

/**
 * Configuration for {@link createKeyboardDragMediator}.
 *
 * The mediator owns the listener *lifecycle*; the caller owns every *decision*.
 * `isLifted` is read on each keydown to route the event, and the two keydown
 * callbacks plus `onFocusOut` carry the caller's domain logic.
 */
export interface KeyboardDragMediatorConfig {
  /** Element the capture-phase `keydown` / `focusout` listeners attach to (the coordinator host). */
  readonly host: HTMLElement;
  /** Whether code runs in a browser. The mediator no-ops entirely on the server. */
  readonly isBrowser: boolean;
  /** The owner's `DestroyRef`; the mediator removes its listeners on destroy. */
  readonly destroyRef: DestroyRef;
  /** `true` while a keyboard drag is in progress. Read on every keydown to route the event. */
  isLifted(): boolean;
  /**
   * A keydown fired while no keyboard drag is in progress. The caller decides whether it starts
   * a lift (and whether to `preventDefault` / `stopPropagation`). Keys with no lift meaning must
   * be left untouched so they fall through to the underlying collection's own handlers.
   */
  onIdleKeydown(event: KeyboardEvent): void;
  /**
   * A keydown fired while a keyboard drag is in progress. The caller resolves it to a move /
   * commit / cancel and consumes the event (`preventDefault` + `stopPropagation`) so the
   * underlying collection never sees the navigation / activation key.
   */
  onLiftedKeydown(event: KeyboardEvent): void;
  /** A `focusout` fired on the host. The caller decides whether it should cancel an in-flight drag. */
  onFocusOut(event: FocusEvent): void;
}

/**
 * Wires the capture-phase keyboard mediation shared by container-level drag-reorder
 * coordinators (`ForTreeNodeDrag`, `ForTableRowReorder`, `ForListboxReorder`).
 *
 * Each of those coordinators lives on a container whose children own their own roving
 * tabindex / selection, so the coordinator must intercept keys in the **capture phase** —
 * before they reach the focused child — and `stopPropagation` the ones it consumes, leaving
 * untouched keys to fall through. This function owns the error-prone half of that contract:
 * the SSR gate, the symmetric `{ capture: true }` add / remove of the `keydown` listener (a
 * mismatched flag silently leaks the listener), the paired `focusout` listener, the
 * lifted-vs-idle routing decision, and teardown via `DestroyRef`. Domain behavior — what lifts,
 * what each key does, when a `focusout` cancels — stays with the caller through the callbacks.
 *
 * The caller keeps ownership of its pointer session and of cancelling an in-flight drag on
 * destroy (those differ per coordinator); this mediator removes only the keyboard / focus
 * listeners it installed.
 */
export function createKeyboardDragMediator(config: KeyboardDragMediatorConfig): void {
  if (!config.isBrowser) {
    return;
  }
  const { host } = config;
  const onKeydown = (event: KeyboardEvent): void => {
    if (config.isLifted()) {
      config.onLiftedKeydown(event);
    } else {
      config.onIdleKeydown(event);
    }
  };
  const onFocusOut = (event: FocusEvent): void => config.onFocusOut(event);

  host.addEventListener('keydown', onKeydown, { capture: true });
  host.addEventListener('focusout', onFocusOut);

  config.destroyRef.onDestroy(() => {
    host.removeEventListener('keydown', onKeydown, { capture: true });
    host.removeEventListener('focusout', onFocusOut);
  });
}
