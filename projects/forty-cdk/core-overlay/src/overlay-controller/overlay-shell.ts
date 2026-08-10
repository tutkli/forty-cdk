import { DestroyRef, ElementRef, inject, type Signal } from '@angular/core';

import {
  afterNextRenderCancellable,
  findFirstFocusable,
  MODAL_PEER_ATTRIBUTE,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  injectDismissibleLayer,
  type DismissibleLayerActivateOptions,
  type DismissibleLayerNesting,
} from '../dismissible-layer/dismissible-layer';
import { injectFloating, type FloatingConfig } from '../floating/floating';
import { InertSiblingsStack } from '../inert-siblings/inert-siblings';
import { injectItemAlignedPositioner, type ItemAlignedConfig } from '../floating/item-aligned';
import { buildOutsideVetoOptions, outsideVetoChannels } from './outside-veto';

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
 * Outside-interaction wiring for a trigger-anchored overlay.
 *
 * Each wired channel builds one `VetoableNativeEvent` and hands it to both the specific emitter and
 * the composite `interactOutside` one, so a `preventDefault()` from either vetoes the close. When
 * nothing vetoes and `dismissible()` is `true`, the shell calls `requestClose` with the channel's
 * reason. `dismissible` and `requestClose` are required whenever any outside channel is wired.
 *
 * `exemptElements` is re-read on every event, so newly portaled siblings and swapped triggers are
 * honoured.
 *
 * Escape is forwarded verbatim and never participates in the outside-close: its close behaviour
 * differs per primitive, so emitting and closing stay the consumer's decision.
 *
 * Every callback is optional; the shell registers a listener only for the channels supplied.
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
  /**
   * Declared nesting position of this surface inside a chain of structurally
   * nested overlays (a menu and its submenus). Forwarded verbatim to the
   * dismissible layer so the stack orders the chain by depth instead of by the
   * order the levels happened to render in. Omit for a standalone overlay.
   */
  readonly nesting?: DismissibleLayerNesting;
}

/**
 * Where initial focus should land when the surface mounts.
 *
 * - `'first'` — first focusable descendant of the host (uses the shared
 *   `findFirstFocusable` selector). Falls back to the host element itself.
 * - `'container'` — host element (gets `tabindex="-1"` semantics from the
 *   primitive's host bindings).
 * - `move()` — primitive-owned focus algorithm (e.g. Menu's
 *   `focusInitialEnabledItem`, Select's `focusSelectedOption`). Should return
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
 * Owns the lifecycle of a portaled, trigger-anchored overlay surface — the `*-content` directives
 * of Popover, the menu family, Combobox, Select, Tooltip and HoverCard.
 *
 * Positioning is delegated to the configured positioner, which portals the host itself: the caller
 * must not also call `injectPortal`.
 *
 * When configured, the shell activates a dismissible layer after the first render, performs the
 * initial focus move — falling back to the host when the move finds no candidate — and restores
 * focus to the return target on destroy. Both focus moves are skipped when their `veto()` returns
 * truthy, which is how `autoFocusOnOpen` / `autoFocusOnClose` are honoured.
 *
 * Return focus runs after the portaled node has been detached, so the trigger receives the focus
 * event in a settled layout.
 *
 * Must be called from an injection context. The host's `ElementRef` is forwarded to the dismissible
 * layer and the positioner.
 */
export function injectOverlayShell(config: OverlayShellConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;
  const inertStack = inject(InertSiblingsStack);

  // 1. Dismissible layer. Created BEFORE the positioner so its
  //    `DestroyRef.onDestroy` (dismissible.deactivate) registers first and
  //    therefore runs first on teardown — i.e. the layer is removed from
  //    the stack before the positioner's portal removes the node from the
  //    DOM. That ordering matches every pre-shell *-content directive and
  //    avoids a window where a focusin fired during DOM removal could
  //    route through `handleFocusIn` and trigger a spurious onFocusOutside.
  const dismissCfg = config.dismiss;
  const layer = dismissCfg !== undefined ? injectDismissibleLayer() : null;

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
  //    cancelled, so the dismissible layer is never pushed onto the stack. On
  //    the synchronous-teardown path the callback flushes just before the
  //    layer's own `DestroyRef.onDestroy` (registered above via
  //    `injectDismissibleLayer`, so it runs first among the destroy hooks),
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
      const options: DismissibleLayerActivateOptions = {
        channels: outsideVetoChannels(dismissCfg),
        ...buildOutsideVetoOptions(dismissCfg),
      };

      if (dismissCfg.exemptElements) {
        options.exemptElements = dismissCfg.exemptElements;
      }
      if (dismissCfg.nesting) {
        options.nesting = dismissCfg.nesting;
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
 * Resolves the real DOM element an overlay is anchored to, for the modal-peer ownership check.
 *
 * Falls back to the `VirtualElement`'s `contextElement` and then to the return-focus target for
 * pointer-positioned overlays. Returns `null` when no backing element exists, leaving the overlay
 * unmarked.
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
