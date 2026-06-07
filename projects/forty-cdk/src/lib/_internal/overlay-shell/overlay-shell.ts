import { DestroyRef, ElementRef, inject, type Signal } from '@angular/core';

import { afterNextRenderCancellable } from '../after-next-render-cancellable/after-next-render-cancellable';
import {
  injectDismissableLayer,
  type DismissableLayerActivateOptions,
} from '../dismissable-layer/dismissable-layer';
import { findFirstFocusable } from '../focus-trap/focus-trap';
import { injectFloating, type FloatingConfig } from '../floating/floating';
import { injectItemAlignedPositioner, type ItemAlignedConfig } from '../floating/item-aligned';
import {
  createVetoableNativeEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';

/**
 * Tagged-union positioner config. The shell delegates to either
 * `injectFloating` (the standard Radix-style anchored placement) or
 * `injectItemAlignedPositioner` (the macOS-style overlay used by Select's
 * `position="item-aligned"` mode). Both helpers portal by default, so the
 * shell never calls `injectPortal` itself — that responsibility stays with
 * the positioner.
 */
export type OverlayShellPositionerConfig =
  | ({ readonly kind: 'floating' } & FloatingConfig)
  | ({ readonly kind: 'item-aligned' } & ItemAlignedConfig);

/**
 * Dismissable-layer wiring. The shell owns the pointer/focus/interact veto
 * reuse that every trigger-anchored overlay (Popover, Menu / MenuSub /
 * ContextMenu / DropdownMenu, Combobox, Select, date-picker) used to
 * duplicate verbatim as a per-primitive `#pendingOutsideVeto` field:
 *
 * - The specific outside channels (pointer-down-outside / focus-outside) fire
 *   on the same physical interaction as the composite `interactOutside`, and
 *   the dismissable layer always invokes the specific listener first. The
 *   shell builds a single `VetoableNativeEvent` on the specific call, hands it
 *   to the consumer's emitter, and reuses it for the immediately-following
 *   composite call so a `preventDefault()` from either handler vetoes the
 *   close.
 * - When the consumer doesn't veto AND `dismissible()` is `true`, the shell
 *   calls `requestClose(reason)` with the channel's reason
 *   (`'pointerDownOutside' | 'focusOutside'`) from the composite handler.
 *   `dismissible` / `requestClose` are required whenever any outside channel
 *   is wired and unused otherwise.
 * - `exemptElements` is recomputed on every event so DOM mutations (newly
 *   portaled siblings, swapped triggers) are picked up live.
 *
 * Escape stays a one-shot, consumer-owned channel (`emitEscapeKeyDown`
 * receives the raw `KeyboardEvent` and forwards verbatim to the layer): it
 * never participates in the shared `#pendingOutsideVeto` reuse, and its close
 * behaviour differs per primitive (hover-card schedules a close, the input-
 * focused combobox owns Escape on its input directive and omits it here). The
 * shell therefore leaves Escape's emit + close decision entirely to the
 * consumer.
 *
 * Each callback is individually optional so a primitive can opt out of a
 * single channel; the shell registers a layer listener only for the channels
 * the consumer actually forwards.
 */
export interface OverlayShellDismissConfig {
  /**
   * Whether an un-vetoed outside interaction fires the implicit
   * `requestClose`. Required when any outside channel
   * (`emitPointerDownOutside` / `emitFocusOutside` / `emitInteractOutside`)
   * is wired.
   */
  readonly dismissible?: Signal<boolean>;
  /**
   * Called with the matching reason when the consumer doesn't veto an outside
   * interaction. The consumer owns the close (and any bookkeeping such as
   * marking the control touched); the shell never touches the directive's
   * close output directly. Required alongside `dismissible`.
   */
  readonly requestClose?: (reason: 'pointerDownOutside' | 'focusOutside') => void;
  /** Forwards the raw Escape `KeyboardEvent` to the consumer; close is consumer-owned. */
  readonly emitEscapeKeyDown?: (event: KeyboardEvent) => void;
  /** Forwards the pointer-down-outside veto to the directive's `(pointerDownOutside)` output. */
  readonly emitPointerDownOutside?: (veto: VetoableNativeEvent<PointerEvent>) => void;
  /** Forwards the focus-outside veto to the directive's `(focusOutside)` output. */
  readonly emitFocusOutside?: (veto: VetoableNativeEvent<FocusEvent>) => void;
  /** Forwards the composite veto to the directive's `(interactOutside)` output. */
  readonly emitInteractOutside?: (veto: VetoableNativeEvent<PointerEvent | FocusEvent>) => void;
  /**
   * Extra elements whose subtrees count as "inside" for outside-pointer /
   * outside-focus checks (e.g. an anchored trigger that lives outside the
   * portaled content). Recomputed on every event so DOM mutations are
   * picked up.
   */
  readonly exemptElements?: () => readonly Element[];
}

/**
 * Where initial focus should land when the surface mounts.
 *
 * - `'first'` — first focusable descendant of the host (uses the shared
 *   `findFirstFocusable` selector). Falls back to the host element itself.
 * - `'container'` — host element (gets `tabindex="-1"` semantics from the
 *   primitive's host bindings).
 * - `move()` — primitive-owned focus algorithm (e.g. Menu's
 *   `focusFirstEnabledItem`, Select's `focusSelectedOption`). Should return
 *   `true` on success and `false` if no candidate was found, so the shell can
 *   fall back to focusing the host element.
 */
export type OverlayShellInitialFocusMove = 'first' | 'container' | (() => boolean);

/**
 * Optional initial-focus wiring. Absent when the consumer wants focus to
 * stay where it is (Combobox keeps focus in the input; Tooltip / HoverCard
 * have no focus moves).
 *
 * `veto` corresponds to the `(autoFocusOnOpen)` output: returning `true`
 * skips the imperative focus move.
 */
export interface OverlayShellInitialFocusConfig {
  readonly move: OverlayShellInitialFocusMove;
  readonly veto?: () => boolean;
}

/**
 * Optional return-focus wiring. Absent when the consumer never wants to
 * return focus on destroy (Combobox closes back into the input via its own
 * keydown / blur paths; Tooltip / HoverCard are non-focusing).
 *
 * - `enabled` — the primitive's `[returnFocus]` input. When `false`, the
 *   shell skips the return-focus call entirely.
 * - `target` — the element to focus on destroy (typically the trigger).
 *   Returning `null` is a safe no-op (the trigger may have unmounted).
 * - `veto` — `(autoFocusOnClose)` veto. Returning `true` skips the focus
 *   call.
 * - `skip` — additional opt-out. Used by Select to skip return-focus when
 *   `lastCloseReason() === 'tab'` (Tab already moved focus to the trigger
 *   and let the browser advance from there).
 */
export interface OverlayShellReturnFocusConfig {
  readonly enabled: Signal<boolean>;
  readonly target: () => HTMLElement | null;
  readonly veto?: () => boolean;
  readonly skip?: () => boolean;
}

/**
 * Single config for the overlay-content lifecycle. Each sub-bundle is
 * individually optional so the nine concrete primitives (Popover, Menu,
 * MenuSub, ContextMenu, DropdownMenu, Combobox, Select, Tooltip, HoverCard)
 * can opt in to only the pieces they need.
 *
 * The shell never reads any of the primitive's own context tokens — the
 * caller forwards each piece as plain signals / callbacks so the shell stays
 * orthogonal to the primitive surface and trivially mockable in tests.
 */
export interface OverlayShellConfig {
  readonly positioner: OverlayShellPositionerConfig;
  readonly dismiss?: OverlayShellDismissConfig;
  readonly initialFocus?: OverlayShellInitialFocusConfig;
  readonly returnFocus?: OverlayShellReturnFocusConfig;
}

/**
 * Single source of truth for the floating-overlay content lifecycle. Drives
 * every `*-content.ts` directive in the library that mounts a portaled
 * surface (`Popover`, `Menu` / `MenuSub` / `ContextMenu` via the shared
 * `[forMenuContent]`, `Combobox`, `Select`, `Tooltip`, `HoverCard`). The
 * shell owns:
 *
 * 1. Positioning. Delegates to `injectFloating` (default) or
 *    `injectItemAlignedPositioner` (Select's `position="item-aligned"`).
 *    Both positioners portal by default, so the shell never calls
 *    `injectPortal` itself — the consumer must NOT either, on pain of
 *    double-portaling (see #106).
 * 2. Dismissable layer. When `dismiss` is configured, creates a layer for
 *    the host element and activates it inside `afterNextRender`. The shell
 *    owns the triple-veto + composite `interactOutside` bookkeeping: it
 *    builds one `VetoableNativeEvent` per physical interaction and reuses it
 *    across the specific (`pointerDownOutside` / `focusOutside`) and composite
 *    (`interactOutside`) channels, so a `preventDefault()` from either
 *    suppresses the implicit close. When the consumer doesn't veto and
 *    `dismissible()` is `true`, the shell calls `requestClose(reason)`.
 *    Deactivation runs from the shell's `DestroyRef.onDestroy` hook.
 * 3. Initial focus. When `initialFocus` is configured, runs `veto()` first;
 *    if it returns truthy the imperative focus move is skipped (this is the
 *    `(autoFocusOnOpen)` veto). Otherwise the shell either calls the
 *    primitive-owned `move()` callback (Menu / Select), focuses the first
 *    focusable descendant via the shared `findFirstFocusable` from
 *    `focus-trap.ts` (Popover's `'first'` mode), or focuses the host
 *    container directly (Popover's `'container'` mode). When the chosen
 *    move returns `false` (no candidate), focus falls back to the host so
 *    keyboard users always land somewhere predictable.
 * 4. Return focus. When `returnFocus` is configured and `enabled()` is true,
 *    on destroy the shell consults `skip()` and `veto()` (`(autoFocusOnClose)`)
 *    and, if neither vetoes, calls `target()?.focus()`.
 *
 * Destroy ordering matches the per-primitive code that this helper replaced.
 * Hooks fire in registration order: `injectDismissableLayer` runs first
 * (deactivate + remove from stack), then the positioner's portal helper
 * (`el.remove()`), and the return-focus hook is registered last so it runs
 * after the portaled DOM node is detached — the trigger receives the focus
 * event in a stable layout.
 *
 * Must be called from an injection context (typically the directive
 * constructor). Forwards the host's `ElementRef` to the dismissable layer
 * and the positioner; the consumer never has to touch them.
 *
 * @example
 * // Popover-content
 * injectOverlayShell({
 *   positioner: { kind: 'floating', reference: ctx.reference, open: ctx.open, ... },
 *   dismiss: {
 *     dismissible: ctx.dismissible,
 *     requestClose: () => ctx.open.set(false),
 *     emitEscapeKeyDown: (event) => ctx.emitEscapeKeyDown(event),
 *     emitPointerDownOutside: (veto) => ctx.pointerDownOutside.emit(veto),
 *     emitFocusOutside: (veto) => ctx.focusOutside.emit(veto),
 *     emitInteractOutside: (veto) => ctx.interactOutside.emit(veto),
 *     exemptElements: () => (ctx.trigger() ? [ctx.trigger()!] : []),
 *   },
 *   initialFocus: {
 *     move: ctx.initialFocus() === 'container' ? 'container' : 'first',
 *     veto: () => ctx.emitAutoFocusOnOpen(),
 *   },
 *   returnFocus: {
 *     enabled: ctx.returnFocus,
 *     target: () => ctx.trigger(),
 *     veto: () => ctx.emitAutoFocusOnClose(),
 *   },
 * });
 */
export function injectOverlayShell(config: OverlayShellConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;

  // 1. Dismissable layer. Created BEFORE the positioner so its
  //    `DestroyRef.onDestroy` (dismissable.deactivate) registers first and
  //    therefore runs first on teardown — i.e. the layer is removed from
  //    the stack before the positioner's portal removes the node from the
  //    DOM. That ordering matches every pre-shell *-content directive and
  //    avoids a window where a focusin fired during DOM removal could
  //    route through `handleFocusIn` and trigger a spurious onFocusOutside.
  const dismissCfg = config.dismiss;
  const layer = dismissCfg !== undefined ? injectDismissableLayer() : null;

  // 2. Positioner. The kind is read once at construction; switching modes
  //    at runtime would require unmounting + remounting the directive,
  //    which is the expected pattern for primitives whose positioning
  //    algorithm is structurally different (Select's two modes).
  if (config.positioner.kind === 'item-aligned') {
    const { kind: _ignored, ...rest } = config.positioner;
    injectItemAlignedPositioner(rest);
  } else {
    const { kind: _ignored, ...rest } = config.positioner;
    injectFloating(rest);
  }

  // 3. afterNextRender — activate the layer and run initial focus once
  //    input bindings have settled. Both pieces depend on having a
  //    fully-rendered host element (exempt-element queries, focus targets).
  //    `afterNextRenderCancellable` makes the destroy-before-render path safe.
  //    On the true-async path (queued render after destroy) the callback is
  //    cancelled, so the dismissable layer is never pushed onto the stack. On
  //    the synchronous-teardown path the callback flushes just before the
  //    layer's own `DestroyRef.onDestroy` (registered above via
  //    `injectDismissableLayer`, so it runs first among the destroy hooks),
  //    which pops the just-pushed layer. Either way the stack is left without
  //    a dead topmost entry that would swallow every later Escape /
  //    pointer-down-outside.
  afterNextRenderCancellable(() => {
    if (layer && dismissCfg) {
      // Pointer-down-outside and focus-outside both fire on the same physical
      // interaction as the composite `interactOutside`, and the dismissable
      // layer always invokes the specific listener before the composite one.
      // We build a single veto wrapper on the specific call and reuse it for
      // the composite call, so a `preventDefault()` in either handler vetoes
      // the close. Escape never enters this reuse — it is a one-shot,
      // consumer-owned channel forwarded verbatim below.
      let pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;
      const requestClose = dismissCfg.requestClose;
      const dismissible = dismissCfg.dismissible;
      const options: DismissableLayerActivateOptions = {};

      if (dismissCfg.exemptElements) {
        options.exemptElements = dismissCfg.exemptElements;
      }
      // Escape: forwarded verbatim. The consumer owns the emit + close
      // decision (combobox routes it through its input directive instead and
      // omits this channel; hover-card schedules a timed close).
      if (dismissCfg.emitEscapeKeyDown) {
        options.onEscapeKeyDown = dismissCfg.emitEscapeKeyDown;
      }
      if (dismissCfg.emitPointerDownOutside) {
        const emit = dismissCfg.emitPointerDownOutside;
        options.onPointerDownOutside = (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          emit(pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
        };
      }
      if (dismissCfg.emitFocusOutside) {
        const emit = dismissCfg.emitFocusOutside;
        options.onFocusOutside = (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          emit(pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
        };
      }
      if (dismissCfg.emitInteractOutside) {
        const emit = dismissCfg.emitInteractOutside;
        options.onInteractOutside = (event) => {
          const veto =
            pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          pendingOutsideVeto = null;
          emit(veto);
          if (!veto.defaultPrevented && dismissible?.() && requestClose) {
            requestClose(event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside');
          }
        };
      }

      layer.activate(options);
    }

    const focusCfg = config.initialFocus;
    if (focusCfg) {
      // Veto first — the `(autoFocusOnOpen)` output's `preventDefault`
      // returns true here, mirroring what the per-primitive code did.
      if (focusCfg.veto?.()) {
        return;
      }
      const move = focusCfg.move;
      if (move === 'first') {
        (findFirstFocusable(el) ?? el).focus();
      } else if (move === 'container') {
        el.focus();
      } else {
        // Primitive-owned focus algorithm (Menu's first/last item, Select's
        // selected option, etc.). Returns true on success; on miss we fall
        // back to the host so keyboard users land somewhere predictable.
        const moved = move();
        if (!moved) {
          el.focus();
        }
      }
    }
  });

  // 4. Return focus on destroy. The hook is registered AFTER the layer's
  //    destroy hook (created above) and AFTER the positioner's portal hook
  //    (created inside injectFloating / injectItemAlignedPositioner) so it
  //    runs last — same ordering as the pre-shell hand-rolled code.
  const rfCfg = config.returnFocus;
  if (rfCfg) {
    inject(DestroyRef).onDestroy(() => {
      if (rfCfg.skip?.()) {
        return;
      }
      if (rfCfg.veto?.()) {
        return;
      }
      if (!rfCfg.enabled()) {
        return;
      }
      rfCfg.target()?.focus();
    });
  }
}
