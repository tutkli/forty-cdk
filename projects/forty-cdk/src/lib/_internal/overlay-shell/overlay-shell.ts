import { afterNextRender, DestroyRef, ElementRef, inject, type Signal } from '@angular/core';

import {
  injectDismissableLayer,
  type DismissableLayerActivateOptions,
} from '../dismissable-layer/dismissable-layer';
import { findFirstFocusable } from '../focus-trap/focus-trap';
import { injectFloating, type FloatingConfig } from '../floating/floating';
import { injectItemAlignedPositioner, type ItemAlignedConfig } from '../floating/item-aligned';

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
 * Optional dismissable-layer wiring. Each callback is individually optional
 * so a primitive can opt out of a single channel — Combobox keeps Escape on
 * its input directive (focus stays in the input) and wires only
 * pointer-down / focus-outside through the shared layer.
 *
 * Each handler receives the native event and may call `preventDefault()` to
 * veto the implicit dismiss, exactly mirroring `DismissableLayerActivateOptions`.
 *
 * `exemptElements` is recomputed on every event so DOM mutations (newly
 * portaled siblings, swapped triggers) are picked up live.
 */
export interface OverlayShellDismissConfig {
  readonly emitEscapeKeyDown?: (event: KeyboardEvent) => void;
  readonly emitPointerDownOutside?: (event: PointerEvent) => void;
  readonly emitFocusOutside?: (event: FocusEvent) => void;
  readonly emitInteractOutside?: (event: PointerEvent | FocusEvent) => void;
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
 *    the host element and activates it inside `afterNextRender` with the
 *    forwarded callbacks. The native event's `preventDefault()` still vetoes
 *    the implicit dismiss because the wiring goes through
 *    `DismissableLayerActivateOptions` verbatim. Deactivation runs from the
 *    shell's `DestroyRef.onDestroy` hook.
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
 *     emitEscapeKeyDown: (e) => ctx.emitEscapeKeyDown(e),
 *     emitPointerDownOutside: (e) => ctx.emitPointerDownOutside(e),
 *     emitFocusOutside: (e) => ctx.emitFocusOutside(e),
 *     emitInteractOutside: (e) => ctx.emitInteractOutside(e),
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
  afterNextRender(() => {
    if (layer && dismissCfg) {
      // Forward verbatim — `preventDefault()` semantics flow through the
      // `DismissableLayerActivateOptions` contract unchanged.
      const options: DismissableLayerActivateOptions = {};
      if (dismissCfg.emitEscapeKeyDown) {
        options.onEscapeKeyDown = dismissCfg.emitEscapeKeyDown;
      }
      if (dismissCfg.emitPointerDownOutside) {
        options.onPointerDownOutside = dismissCfg.emitPointerDownOutside;
      }
      if (dismissCfg.emitFocusOutside) {
        options.onFocusOutside = dismissCfg.emitFocusOutside;
      }
      if (dismissCfg.emitInteractOutside) {
        options.onInteractOutside = dismissCfg.emitInteractOutside;
      }
      if (dismissCfg.exemptElements) {
        options.exemptElements = dismissCfg.exemptElements;
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
