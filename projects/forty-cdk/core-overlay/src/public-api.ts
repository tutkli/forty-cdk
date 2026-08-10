/*
 * Overlay slice of forty-cdk's internal shared surface — the
 * `forty-cdk/core-overlay` entry point.
 *
 * Everything here used to live in `forty-cdk/core`. It was cut out in
 * [#1723](https://github.com/tutkli/forty-cdk/issues/1723) because a single
 * FESM is a single chunk-splitting unit: `core` is a static import edge from
 * all 60 entry points, so the positioning engine every anchored overlay needs
 * — `@floating-ui/dom` plus `core/floating`, 25.5 KB of the 47.72 KB the
 * measurement attributed to this family — was merged into the chunk a
 * `[forSwitch]` route also loads. Splitting the family into its own FESM
 * leaves it in a chunk only the entry points that actually anchor, trap, or
 * portal a surface reach.
 *
 * The cut has one direction and it is load-bearing: `forty-cdk/core-overlay`
 * imports `forty-cdk/core`, and `forty-cdk/core` imports nothing from here.
 * A single edge the other way would merge the two chunks again and undo the
 * split — which is why `MODAL_PEER_ATTRIBUTE` / `MODAL_EXEMPT_ATTRIBUTE`
 * (read by `LiveAnnouncer`) and `resolveConfigClass` (read by
 * `ForToastManager`) stayed behind in `forty-cdk/core`, and why
 * `core/swipe-dismiss` did too: `forty-cdk/carousel` is one of its consumers
 * and anchors nothing.
 *
 * THIS ENTRY POINT IS NOT PUBLIC. Like `forty-cdk/core` it carries no semver
 * guarantees and is exported only so forty-cdk's own entry points share one
 * compiled module — never duplicated per primitive, which would split the DI
 * singletons (`DismissibleLayerStack`, `InertSiblingsStack`, `BodyScrollLock`,
 * `ForDrawerStack`, `ScrollDismissDispatcher`) into multiple instances and
 * break cross-primitive coordination. `scripts/check-entrypoint-dedup.mjs`
 * asserts that each of them is defined in exactly one FESM.
 *
 * The blessed / internal tiering is the one `forty-cdk/core` documents, and it
 * spans both barrels: the blessed symbols declared here
 * (`FloatingSide`, `FloatingAlign`, `FloatingFallbackAxisSideDirection`,
 * `FOR_MENU_CONTEXT`, `ForMenuContext`, `ForMenuCloseReason`,
 * `ForMenuItemHandle`, `MenuActivationModality`, `MenuOpenerPositioning`,
 * `MenuSiblingNavigator`, `ListboxOverlayContext`, `Point`) are published to
 * consumers by `forty-cdk/shared`, and `ForDrawerSide` by `forty-cdk/drawer`.
 * Everything else is internal by omission — see the core tier section in
 * `.claude/rules/conventions.md`.
 *
 * Which of these modules a new overlay composes is a decision table in that
 * same file; read it before importing from here.
 */

export { BodyScrollLock } from './body-scroll-lock/body-scroll-lock';
export {
  DismissibleLayerStack,
  injectDismissibleLayer,
} from './dismissible-layer/dismissible-layer';
export { type ForDrawerSide } from './drawer-stack/drawer-side';
export {
  type DrawerStackHandle,
  type DrawerStackNode,
  ForDrawerStack,
} from './drawer-stack/drawer-stack';
export { AnchoredFormValueControlBase } from './floating/anchored-form-value-control-base';
export {
  AnchoredOverlayPositioningBase,
  type AnchoredPositioningOverride,
  type AnchoredPositioningSeedDefaults,
} from './floating/anchored-overlay-positioning-base';
export {
  ANCHORED_POSITIONING_DEFAULTS,
  type AnchoredPositioningContext,
  toFloatingPositioner,
} from './floating/anchored-positioning-inputs';
export {
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
} from './floating/floating';
export { createDebouncedAction, type DebouncedAction } from './hover-intent/debounced-action';
export {
  createHoverIntent,
  forceCloseWhenDisabled,
  type HoverIntentScheduler,
} from './hover-intent/hover-intent';
export { createSkipDelayWindow, SkipDelayCoordinator } from './hover-intent/skip-delay';
export { InertSiblingsStack } from './inert-siblings/inert-siblings';
export {
  type ListboxOverlayContext,
  ListboxOverlayController,
} from './listbox-overlay/listbox-overlay-controller';
export {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
  injectMenuContext,
  type MenuActivationModality,
  menuLayerNesting,
  type MenuSiblingNavigator,
} from './menu-overlay/menu-context';
export { createMenuItemList, type MenuItemHandle } from './menu-overlay/menu-item-list';
export {
  asMenuOpenerRegistration,
  type MenuOpenerOptions,
  type MenuOpenerPositioning,
  type MenuOpenerRegistration,
} from './menu-overlay/menu-opener-registry';
export { createMenuOverlay, MenuOverlay } from './menu-overlay/menu-overlay';
export { MenuOverlayHost } from './menu-overlay/menu-overlay-host';
export { injectModalShell } from './modal-shell/modal-shell';
export { ModalSurfaceBase } from './modal-shell/modal-surface-base';
export { CloseReasonState } from './overlay-controller/close-reason-state';
export {
  anchorSlot,
  elementSlot,
  injectIdentifiedSlot,
  injectSlotId,
} from './overlay-controller/element-registry';
export { InitialFocusState } from './overlay-controller/initial-focus-state';
export {
  type MountedWhileClosedConfig,
  warnIfMountedWhileClosed,
} from './overlay-controller/mounted-while-closed';
export {
  OverlayController,
  type OverlayControllerDeps,
  type OverlayEmitTargets,
  type OverlayOpenOptions,
  type OverlayOpenOutcome,
  type OverlayTransitionOptions,
  type OverlayTriggerSlot,
} from './overlay-controller/overlay-controller';
export {
  injectOverlayShell,
  type OverlayShellConfig,
  type OverlayShellPositionerConfig,
} from './overlay-controller/overlay-shell';
export {
  OverlayManagerCore,
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
  type OverlaySurface,
} from './overlay-manager/overlay-manager';
export { OverlayRef } from './overlay-manager/overlay-ref';
export {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
} from './pointer-grace/pointer-grace';
export { injectPortal } from './portal/portal';
export { ScrollDismissDispatcher } from './scroll-dismiss/scroll-dismiss-dispatcher';
