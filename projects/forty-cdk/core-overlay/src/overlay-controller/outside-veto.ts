import type { Signal } from '@angular/core';

import type {
  DismissibleLayerActivateOptions,
  DismissibleLayerChannel,
} from '../dismissible-layer/dismissible-layer';
import { createVetoableNativeEvent, type VetoableNativeEvent } from 'forty-cdk/core';

/**
 * Emit forwarders + implicit-close wiring for the outside-interaction channels
 * that {@link buildOutsideVetoOptions} folds into self-closing layer handlers.
 * Each wired outside channel builds one veto, emits it through the specific
 * output (if wired) and the composite `interactOutside` output (if wired), then
 * closes itself when un-vetoed and `dismissible()` is `true`. Escape is
 * intentionally absent: it never participates in the outside-close (it is a
 * one-shot channel whose close behaviour differs per shell), so each shell
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
   * `requestClose`. Read fresh on every outside interaction.
   */
  readonly dismissible?: Signal<boolean>;
  /**
   * Called with the matching reason (`'pointerDownOutside'` / `'focusOutside'`)
   * when the consumer doesn't veto the outside interaction and `dismissible()`
   * is `true`. Each wired outside channel fires its own close.
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
 * Builds the pointer-down-outside / focus-outside entries of a
 * {@link DismissibleLayerActivateOptions}, folding the composite
 * `interactOutside` emit and the implicit close into each specific channel so
 * every wired outside channel closes itself.
 *
 * The protocol: each handler builds a single {@link VetoableNativeEvent} for
 * its physical interaction, hands it to the specific emitter (if wired) and
 * then to the composite `interactOutside` emitter (if wired), and — when
 * neither subscriber vetoed and `dismissible()` is `true` — calls
 * `requestClose(reason)` with the channel's reason (`'pointerDownOutside'` /
 * `'focusOutside'`). A `preventDefault()` from either the specific or the
 * composite subscriber suppresses the close, since both observe the same veto.
 *
 * `onPointerDownOutside` is registered when either the specific
 * `emitPointerDownOutside` or the composite `emitInteractOutside` is wired, and
 * `onFocusOutside` likewise — matching what {@link outsideVetoChannels}
 * declares — so an interact-only wiring still gets both self-closing handlers.
 * Returns only the channels whose emitter is present, so the caller can spread
 * the result into its `dismissible.activate({...})` call alongside the pieces
 * that stay shell-specific (`exemptElements`, `onEscapeKeyDown`).
 */
export function buildOutsideVetoOptions(
  config: OutsideVetoConfig,
): Pick<DismissibleLayerActivateOptions, 'onPointerDownOutside' | 'onFocusOutside'> {
  const options: Pick<DismissibleLayerActivateOptions, 'onPointerDownOutside' | 'onFocusOutside'> =
    {};
  const {
    dismissible,
    requestClose,
    emitPointerDownOutside,
    emitFocusOutside,
    emitInteractOutside,
  } = config;

  if (emitPointerDownOutside || emitInteractOutside) {
    options.onPointerDownOutside = (event) => {
      const veto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
      emitPointerDownOutside?.(veto as VetoableNativeEvent<PointerEvent>);
      emitInteractOutside?.(veto);
      if (!veto.defaultPrevented && dismissible?.() && requestClose) {
        requestClose('pointerDownOutside');
      }
    };
  }

  if (emitFocusOutside || emitInteractOutside) {
    options.onFocusOutside = (event) => {
      const veto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
      emitFocusOutside?.(veto as VetoableNativeEvent<FocusEvent>);
      emitInteractOutside?.(veto);
      if (!veto.defaultPrevented && dismissible?.() && requestClose) {
        requestClose('focusOutside');
      }
    };
  }

  return options;
}

/**
 * Derives the outside-interaction channels a shell must declare at
 * `dismissible.activate({ channels })` from the same {@link OutsideVetoConfig}
 * passed to {@link buildOutsideVetoOptions}. A layer owns `'pointer'` when it
 * forwards either the specific pointer-down-outside channel or the composite
 * interact-outside channel (which fires for pointer-downs too), and likewise
 * `'focus'` for focus-outside / interact-outside. A shell that forwards no
 * outside channel (an Escape-only surface) gets `[]` and stays transparent to
 * the real dismissible layers beneath it.
 */
export function outsideVetoChannels(config: OutsideVetoConfig): DismissibleLayerChannel[] {
  const channels: DismissibleLayerChannel[] = [];
  if (config.emitPointerDownOutside || config.emitInteractOutside) {
    channels.push('pointer');
  }
  if (config.emitFocusOutside || config.emitInteractOutside) {
    channels.push('focus');
  }
  return channels;
}
