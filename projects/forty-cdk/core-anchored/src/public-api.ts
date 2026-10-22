/*
 * Anchored slice of forty-cdk's internal shared surface — the
 * `forty-cdk/core-anchored` entry point: everything only a trigger-anchored
 * overlay composes. The positioning engine (`@floating-ui/dom` plus
 * `floating/`), the overlay shell and controller, the menu and listbox
 * overlays, hover intent, pointer grace and scroll dismissal.
 *
 * It was cut out of `forty-cdk/core-overlay` in
 * [#2693](https://github.com/tutkli/forty-cdk/issues/2693): an application that
 * opens a dialog from eager code put that FESM in its initial chunk, and with
 * it every anchored module its lazy routes retained. The edge runs one way:
 * this entry point imports `forty-cdk/core-overlay` and `forty-cdk/core`,
 * and neither imports anything from here, not even a type. The rationale and
 * the other cut are in `forty-cdk/core-overlay`'s barrel header.
 *
 * THIS ENTRY POINT IS NOT PUBLIC. It carries no semver guarantees and is
 * exported only so the anchored primitives share one compiled module, which
 * keeps `ScrollDismissDispatcher` and the `MENU_OPENERS` registry single
 * instances. The blessed symbols declared here (`FloatingSide`,
 * `FloatingAlign`, `FloatingFallbackAxisSideDirection`, `FOR_MENU_CONTEXT`,
 * `ForMenuContext`, `ForMenuCloseReason`, `ForMenuItemHandle`,
 * `MenuActivationModality`, `MenuOpenerPositioning`, `MenuSiblingNavigator`,
 * `ListboxOverlayContext`, `Point`) are published to consumers by
 * `forty-cdk/shared`; everything else is internal by omission.
 */

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
export {
  createHoverIntent,
  forceCloseWhenDisabled,
  type HoverIntentScheduler,
} from './hover-intent/hover-intent';
export {
  createHoverSurfaceState,
  type HoverSurfaceState,
} from './hover-intent/hover-surface-state';
export {
  type ListboxOverlayContext,
  ListboxOverlayController,
  type ListboxOverlayPieceContext,
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
  createMenuOpenerHandle,
  MENU_OPENERS,
  type MenuOpenerHandle,
  type MenuOpenerOptions,
  type MenuOpenerPositioning,
  type MenuOpenerRegistration,
  menuReturnFocusTarget,
  releaseMenuOpener,
} from './menu-overlay/menu-opener-registry';
export { createMenuOverlay, MenuOverlay } from './menu-overlay/menu-overlay';
export { MenuOverlayHost } from './menu-overlay/menu-overlay-host';
export { CloseReasonState } from './overlay-controller/close-reason-state';
export {
  anchorSlot,
  injectIdentifiedSlot,
  injectSlotId,
  type RootedTriggerHandle,
  RootedTriggerSlot,
} from './overlay-controller/element-registry';
export { InitialFocusState } from './overlay-controller/initial-focus-state';
export {
  OverlayController,
  type OverlayControllerDeps,
  type OverlayEmitTargets,
  type OverlayOpenOptions,
  type OverlayOpenOutcome,
  type OverlaySide,
  type OverlaySlot,
  type OverlayTransitionOptions,
} from './overlay-controller/overlay-controller';
export {
  injectOverlayShell,
  type OverlayShellConfig,
  type OverlayShellPositionerConfig,
} from './overlay-controller/overlay-shell';
export {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  type PointerGraceOptions,
  resolveGraceSide,
} from './pointer-grace/pointer-grace';
export {
  ScrollDismissDispatcher,
  type ScrollDismissOptions,
  type ScrollDismissRegistration,
  type ScrollDismissScope,
} from './scroll-dismiss/scroll-dismiss-dispatcher';
