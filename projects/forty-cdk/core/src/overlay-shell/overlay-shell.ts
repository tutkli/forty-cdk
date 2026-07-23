import { DestroyRef, ElementRef, inject, type Signal } from '@angular/core';

import { afterNextRenderCancellable } from '../after-next-render-cancellable/after-next-render-cancellable';
import {
  injectDismissableLayer,
  type DismissableLayerActivateOptions,
} from '../dismissable-layer/dismissable-layer';
import { findFirstFocusable } from '../focus-trap/focus-trap';
import { injectFloating, type FloatingConfig } from '../floating/floating';
import { InertSiblingsStack, MODAL_PEER_ATTRIBUTE } from '../inert-siblings/inert-siblings';
import { injectItemAlignedPositioner, type ItemAlignedConfig } from '../floating/item-aligned';
import { buildOutsideVetoOptions, outsideVetoChannels } from '../overlay-controller/outside-veto';
import type { VetoableNativeEvent } from '../vetoable-event/vetoable-event';

/**
 * Tagged-union positioner config. The shell delegates to either
 * `injectFloating` (the standard anchored placement) or
 * `injectItemAlignedPositioner` (the macOS-style overlay used by Select's
 * `position="item-aligned"` mode). Both helpers portal by default, so the
 * shell never calls `injectPortal` itself — that responsibility stays with
 * the positioner.
 */
export type OverlayShellPositionerConfig =
  | ({ readonly kind: 'floating' } & FloatingConfig)
  | ({ readonly kind: 'item-aligned' } & ItemAlignedConfig);

/**
 * Dismissable-layer wiring. The shell owns the pointer/focus outside-interaction
 * wiring that every trigger-anchored overlay (Popover, Menu / MenuSub /
 * ContextMenu / DropdownMenu, Combobox, Select, date-picker) used to
 * duplicate verbatim:
 *
 * - Each wired outside channel (pointer-down-outside / focus-outside) builds a
 *   single `VetoableNativeEvent` for its physical interaction, hands it to the
 *   consumer's specific emitter (if wired) and to the composite `interactOutside`
 *   emitter (if wired), so a `preventDefault()` from either subscriber vetoes
 *   the close.
 * - When neither subscriber vetoes AND `dismissible()` is `true`, the shell
 *   calls `requestClose(reason)` with the channel's reason
 *   (`'pointerDownOutside' | 'focusOutside'`) — each wired outside channel fires
 *   its own close. `dismissible` / `requestClose` are required whenever any
 *   outside channel is wired and unused otherwise.
 * - `exemptElements` is recomputed on every event so DOM mutations (newly
 *   portaled siblings, swapped triggers) are picked up live.
 *
 * Escape stays a one-shot, consumer-owned channel (`emitEscapeKeyDown`
 * receives the raw `KeyboardEvent` and forwards verbatim to the layer): it
 * never participates in the outside-close, and its close behaviour differs per
 * primitive (hover-card schedules a close, the input-focused combobox owns
 * Escape on its input directive and omits it here). The shell therefore leaves
 * Escape's emit + close decision entirely to the consumer.
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
   * close output directly. Required alongside `dismissible`. Each wired outside
   * channel fires its own close, so a specific channel (`emitPointerDownOutside`
   * / `emitFocusOutside`) closes even without `emitInteractOutside` wired.
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
 *    the host element and activates it inside `afterNextRender`. Each wired
 *    outside channel is self-closing: it builds one `VetoableNativeEvent` per
 *    physical interaction, hands it to the specific (`pointerDownOutside` /
 *    `focusOutside`) and composite (`interactOutside`) emitters, so a
 *    `preventDefault()` from either suppresses the implicit close. When neither
 *    subscriber vetoes and `dismissible()` is `true`, the shell calls
 *    `requestClose(reason)`. Deactivation runs from the shell's
 *    `DestroyRef.onDestroy` hook.
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
  const inertStack = inject(InertSiblingsStack);

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
    // Modal-peer marking (#676). When this overlay is anchored to an element
    // inside an active modal's protected root — i.e. it was opened from inside
    // a Dialog / Drawer (a Select in a form, a context menu on dialog content)
    // — stamp the freshly portaled host so the inert-siblings pass / observer
    // skips it. Without this the body-level inert sweep swallows forty's own
    // overlay, leaving it painted (z-index) but `inert` + `aria-hidden`: clicks
    // fall through to the controls behind it and the surface reads as hidden to
    // assistive tech (#676). `ownsAnchor` returns false when no modal is active,
    // so an overlay with no surrounding modal is never pre-marked (a modal
    // opened later inerts it like any background sibling), and false when the
    // anchor sits in an inerted background subtree, so a toast / background
    // overlay stays isolated (#388 semantics). The positioner's portal ran in
    // an earlier hook of this same render batch, so the host is already in
    // `body`; the attribute is set before the observer's microtask runs, so the
    // host is flagged by the time the observer inspects it.
    const anchor = resolveModalAnchor(config);
    if (anchor && inertStack.ownsAnchor(anchor)) {
      el.setAttribute(MODAL_PEER_ATTRIBUTE, '');
    }

    if (layer && dismissCfg) {
      const options: DismissableLayerActivateOptions = {
        channels: outsideVetoChannels(dismissCfg),
        ...buildOutsideVetoOptions(dismissCfg),
      };

      if (dismissCfg.exemptElements) {
        options.exemptElements = dismissCfg.exemptElements;
      }
      // Escape: forwarded verbatim. The consumer owns the emit + close
      // decision (combobox routes it through its input directive instead and
      // omits this channel; hover-card schedules a timed close).
      if (dismissCfg.emitEscapeKeyDown) {
        options.onEscapeKeyDown = dismissCfg.emitEscapeKeyDown;
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

/**
 * Resolve the real DOM element an overlay is anchored to, for the modal-peer
 * ownership check (#676). Most overlays anchor to a real element (the trigger
 * button / input), exposed directly via the positioner `reference`.
 * Pointer-positioned overlays (ContextMenu) anchor to a floating-ui
 * `VirtualElement`: we read its `contextElement` when present, then fall back
 * to the return-focus target — the logical trigger the overlay was opened
 * from, which for ContextMenu is the registered right-click region. Returns
 * `null` when no backing element can be found (the overlay is then never
 * marked, falling back to the pre-#676 behaviour for that surface).
 */
function resolveModalAnchor(config: OverlayShellConfig): Element | null {
  const ref = config.positioner.reference();
  if (ref instanceof Element) {
    return ref;
  }
  const contextElement = ref?.contextElement;
  if (contextElement instanceof Element) {
    return contextElement;
  }
  return config.returnFocus?.target() ?? null;
}
