/*
 * Overlay slice of forty-cdk's internal shared surface — the
 * `forty-cdk/core-overlay` entry point: the modal shell, the dismissible-layer
 * / inert-siblings / body-scroll-lock / drawer stacks, the imperative manager
 * core and the dev-mode warnings every overlay shares.
 *
 * Everything here used to live in `forty-cdk/core`. It was cut out in
 * [#1723](https://github.com/tutkli/forty-cdk/issues/1723) because a single
 * FESM is a single chunk-splitting unit: `core` is a static import edge from
 * all 60 entry points, so the overlay machinery was merged into the chunk a
 * `[forSwitch]` route also loads. The same reasoning cut the trigger-anchored
 * half out of this entry point in
 * [#2693](https://github.com/tutkli/forty-cdk/issues/2693): the positioning
 * engine (`@floating-ui/dom` plus `floating/`), the overlay shell and
 * controller, the menu and listbox overlays, hover intent, pointer grace and
 * scroll dismissal ship as `forty-cdk/core-anchored`, so an application whose
 * eager code opens only a dialog or a drawer does not load them with it.
 *
 * The cuts have one direction each and both are load-bearing:
 * `forty-cdk/core-anchored` imports this entry point, this one imports
 * `forty-cdk/core`, and nothing points back — not even a type. A single edge
 * the other way would merge two chunks again and undo a split — which is why
 * `MODAL_PEER_ATTRIBUTE` / `MODAL_EXEMPT_ATTRIBUTE` (read by
 * `LiveAnnouncer`), `resolveConfigClass` (read by `ForToastManager`) and
 * `injectPortal` (called by `ForToastViewport`) live in `forty-cdk/core`,
 * why `core/swipe-dismiss` does too (`forty-cdk/carousel` is one of its
 * consumers and anchors nothing), and why `createDebouncedAction` stays here
 * (`[forNavigationMenu]` debounces with it and anchors nothing).
 *
 * THIS ENTRY POINT IS NOT PUBLIC. Like `forty-cdk/core` it carries no semver
 * guarantees and is exported only so forty-cdk's own entry points share one
 * compiled module — never duplicated per primitive, which would split the DI
 * singletons (`DismissibleLayerStack`, `InertSiblingsStack`, `BodyScrollLock`,
 * `ForDrawerStack`, `ModalActivationOrder`) into multiple instances and break
 * cross-primitive coordination. `scripts/check-entrypoint-dedup.mjs` asserts
 * that each of them is defined in exactly one FESM.
 *
 * The blessed / internal tiering is the one `forty-cdk/core` documents, and it
 * spans all three internal barrels: the one blessed symbol declared here,
 * `ForDrawerSide`, is published to consumers by `forty-cdk/drawer`.
 * Everything else is internal by omission — see the core tier section in
 * `.claude/rules/conventions.md`.
 *
 * Which of these modules a new overlay composes is a decision table in that
 * same file; read it before importing from here.
 */

export { BodyScrollLock } from './body-scroll-lock/body-scroll-lock';
export {
  type DismissibleLayerActivateOptions,
  type DismissibleLayerNesting,
  DismissibleLayerStack,
  injectDismissibleLayer,
} from './dismissible-layer/dismissible-layer';
export { buildOutsideVetoOptions, outsideVetoChannels } from './dismissible-layer/outside-veto';
export { type ForDrawerSide } from './drawer-stack/drawer-side';
export {
  type DrawerStackHandle,
  type DrawerStackNode,
  ForDrawerStack,
} from './drawer-stack/drawer-stack';
export { createDebouncedAction, type DebouncedAction } from './debounced-action/debounced-action';
export { type InertSiblingsHandle, InertSiblingsStack } from './inert-siblings/inert-siblings';
export { ModalActivationOrder } from './modal-shell/modal-activation-order';
export {
  injectModalBackdrop,
  type ModalBackdropHandle,
  type ModalBackdropSurface,
  type ModalSurfaceBackdropContext,
} from './modal-shell/modal-backdrop';
export { injectModalShell } from './modal-shell/modal-shell';
export { ModalSurfaceBase } from './modal-shell/modal-surface-base';
export { injectModalTrigger } from './modal-shell/modal-trigger';
export {
  type MountedWhileClosedConfig,
  warnIfMountedWhileClosed,
} from './overlay-warnings/mounted-while-closed';
export {
  type OpenWithoutContentConfig,
  warnIfOpenWithoutContent,
} from './overlay-warnings/open-without-content';
export {
  type UncontrolledTriggerConfig,
  warnIfOpenWithoutControls,
} from './overlay-warnings/uncontrolled-trigger';
export { type UnnamedDialogConfig, warnIfDialogUnnamed } from './overlay-warnings/unnamed-dialog';
export {
  OverlayManagerCore,
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
  type OverlaySurface,
} from './overlay-manager/overlay-manager';
export { OverlayRef } from './overlay-manager/overlay-ref';
