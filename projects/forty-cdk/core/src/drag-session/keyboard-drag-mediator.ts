import type { DestroyRef } from '@angular/core';

/**
 * Configuration for {@link createKeyboardDragMediator}.
 *
 * The mediator owns the listener *lifecycle* plus the one DOM fact it is positioned to answer
 * ("did focus leave the host?"); the caller owns every *domain* decision. `isLifted` is read on
 * each keydown to route the event and again before a deferred focus leave is reported, the two
 * keydown callbacks carry the caller's key semantics, and `onFocusLeave` carries the consequence
 * of a leave.
 */
export interface KeyboardDragMediatorConfig {
  /** Element the capture-phase `keydown` / `focusout` listeners attach to (the coordinator host). */
  readonly host: HTMLElement;
  /** The host's document. Read for `activeElement` when a `focusout` reports no destination. */
  readonly document: Document;
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
  /**
   * Focus has genuinely left the host while a keyboard drag was in progress — the mediator has
   * already resolved containment, so there is nothing left to re-check here. The caller decides
   * the *consequence*, which in every coordinator today is cancelling the in-flight drag.
   *
   * It fires at most once per `focusout`, never while `isLifted()` reports `false`, and never
   * after the owner is destroyed.
   */
  onFocusLeave(): void;
}

/**
 * Wires the capture-phase keyboard mediation shared by container-level drag-reorder
 * coordinators (`ForTreeNodeDrag`, `ForTableRowReorder`, `ForListboxReorder`,
 * `ForVirtualReorder`).
 *
 * Each of those coordinators lives on a container whose children own their own roving
 * tabindex / selection, so the coordinator must intercept keys in the **capture phase** —
 * before they reach the focused child — and `stopPropagation` the ones it consumes, leaving
 * untouched keys to fall through. This function owns the error-prone half of that contract:
 * the SSR gate, the `{ capture: true }` `keydown` listener and its paired `focusout` listener,
 * the lifted-vs-idle routing decision, and teardown via `DestroyRef`. Both listeners share one
 * `AbortController`, so a single `abort()` drops them and a `capture` flag can no longer be
 * mismatched between an add and its removal. Domain behavior — what lifts, what each key does,
 * what a focus leave costs — stays with the caller through the callbacks.
 *
 * **Resolving a focus leave is the mediator's, not the caller's**
 * ([#1673](https://github.com/tutkli/forty-cdk/issues/1673)). A `focusout` whose `relatedTarget`
 * is a node reports where focus landed, so containment against the host answers it outright. A
 * `focusout` reporting `relatedTarget: null` says nothing about *where* focus went — focus may
 * have left the document, landed on a non-focusable area, or simply been dropped by a re-render
 * detaching the focused element — so the decision is deferred one microtask and taken against
 * `document.activeElement` once the focus update has settled, the same resolution
 * `[forNavigationMenu]` applies to its own leave channel. Only then does `onFocusLeave` fire.
 * Before this was folded in, the four callers answered it three different ways and a consumer
 * re-render mid-gesture announced a cancel the user never asked for.
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
  let destroyed = false;
  const onKeydown = (event: KeyboardEvent): void => {
    if (config.isLifted()) {
      config.onLiftedKeydown(event);
    } else {
      config.onIdleKeydown(event);
    }
  };
  const reportLeaveIfFocusIsOutside = (): void => {
    if (destroyed || !config.isLifted()) {
      return;
    }
    const active = config.document.activeElement;
    if (active !== null && host.contains(active)) {
      return;
    }
    config.onFocusLeave();
  };
  const onFocusOut = (event: FocusEvent): void => {
    if (!config.isLifted()) {
      return;
    }
    const related = event.relatedTarget;
    if (related instanceof Node) {
      if (!host.contains(related)) {
        config.onFocusLeave();
      }
      return;
    }
    queueMicrotask(reportLeaveIfFocusIsOutside);
  };

  const controller = new AbortController();
  host.addEventListener('keydown', onKeydown, { capture: true, signal: controller.signal });
  host.addEventListener('focusout', onFocusOut, { signal: controller.signal });

  config.destroyRef.onDestroy(() => {
    destroyed = true;
    controller.abort();
  });
}
