import type { Signal } from '@angular/core';

import type { DismissableLayerActivateOptions } from '../dismissable-layer/dismissable-layer';
import {
  createVetoableNativeEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';

/**
 * Emit forwarders + implicit-close wiring for the three outside-interaction
 * channels that {@link buildOutsideVetoOptions} shares one veto across. Escape
 * is intentionally absent: it never participates in the shared veto reuse (it
 * is a one-shot channel whose close behaviour differs per shell), so each shell
 * wires its own `onEscapeKeyDown` alongside the object this returns.
 *
 * Every field is optional so a shell can register a layer listener only for the
 * channels its consumer actually forwards — the trigger-anchored overlays opt
 * out of individual channels (an input-focused combobox owns Escape on its
 * input and omits it here), while the modal shell forwards all three.
 */
export interface OutsideVetoConfig {
  /**
   * Whether an un-vetoed outside interaction fires the implicit
   * `requestClose`. Read fresh on every composite `interactOutside`.
   */
  readonly dismissible?: Signal<boolean>;
  /**
   * Called with the matching reason from the composite `interactOutside`
   * channel when the consumer doesn't veto and `dismissible()` is `true`.
   */
  readonly requestClose?: (reason: 'pointerDownOutside' | 'focusOutside') => void;
  /** Forwards the pointer-down-outside veto to the directive's `(pointerDownOutside)` output. */
  readonly emitPointerDownOutside?: (veto: VetoableNativeEvent<PointerEvent>) => void;
  /** Forwards the focus-outside veto to the directive's `(focusOutside)` output. */
  readonly emitFocusOutside?: (veto: VetoableNativeEvent<FocusEvent>) => void;
  /** Forwards the composite veto to the directive's `(interactOutside)` output. */
  readonly emitInteractOutside?: (veto: VetoableNativeEvent<PointerEvent | FocusEvent>) => void;
}

/**
 * Builds the pointer-down-outside / focus-outside / composite-interact-outside
 * entries of a {@link DismissableLayerActivateOptions}, encapsulating the
 * triple-veto reuse both `injectModalShell` and `injectOverlayShell` used to
 * hand-roll verbatim as a per-shell `pendingOutsideVeto` field.
 *
 * The protocol: pointer-down-outside and focus-outside fire on the same
 * physical interaction as the composite `interactOutside`, and the dismissable
 * layer always invokes the specific listener before the composite one. A single
 * {@link VetoableNativeEvent} is built on the specific call, handed to the
 * consumer's emitter, and reused for the immediately-following composite call,
 * so a `preventDefault()` in either handler vetoes the close. When no specific
 * channel is wired the composite handler builds a fresh veto for its own event.
 * After an un-vetoed composite interaction the shell calls `requestClose(reason)`
 * (`'pointerDownOutside'` / `'focusOutside'`) when `dismissible()` is `true`.
 *
 * Returns only the channels whose emitter is present, so the caller can spread
 * the result into its `dismissable.activate({...})` call alongside the pieces
 * that stay shell-specific (`exemptElements`, `onEscapeKeyDown`). The shared
 * `pendingOutsideVeto` is captured per call, so a fresh options object must be
 * built for every layer activation.
 */
export function buildOutsideVetoOptions(
  config: OutsideVetoConfig,
): Pick<
  DismissableLayerActivateOptions,
  'onPointerDownOutside' | 'onFocusOutside' | 'onInteractOutside'
> {
  let pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;
  const options: Pick<
    DismissableLayerActivateOptions,
    'onPointerDownOutside' | 'onFocusOutside' | 'onInteractOutside'
  > = {};

  const emitPointerDownOutside = config.emitPointerDownOutside;
  if (emitPointerDownOutside) {
    options.onPointerDownOutside = (event) => {
      pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
      emitPointerDownOutside(pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
    };
  }

  const emitFocusOutside = config.emitFocusOutside;
  if (emitFocusOutside) {
    options.onFocusOutside = (event) => {
      pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
      emitFocusOutside(pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
    };
  }

  const emitInteractOutside = config.emitInteractOutside;
  if (emitInteractOutside) {
    const { dismissible, requestClose } = config;
    options.onInteractOutside = (event) => {
      const veto =
        pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
      pendingOutsideVeto = null;
      emitInteractOutside(veto);
      if (!veto.defaultPrevented && dismissible?.() && requestClose) {
        requestClose(event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside');
      }
    };
  }

  return options;
}
