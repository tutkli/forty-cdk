/*
 * Internal shared surface of forty-cdk — the `forty-cdk/core` entry point.
 *
 * This entry point holds everything formerly under `src/lib/_internal/`: the
 * cross-primitive DI singletons (`LiveAnnouncer`, focus-trap / dismissible-layer
 * / inert-siblings / drawer stacks, the id-generator salt, the defaults
 * registry), the framework-free geometry / interaction / overlay helpers, and
 * the cross-cutting public tokens.
 *
 * It exists so that every primitive entry point can import the shared core by
 * the `forty-cdk/core` specifier and the bundler compiles it exactly ONCE —
 * never duplicated per primitive, which would split the DI singletons into
 * multiple instances and break cross-primitive coordination.
 *
 * THIS ENTRY POINT IS NOT PUBLIC. It carries no semver guarantees and is
 * exported only so forty-cdk's own entry points share one compiled module.
 * Consumers never import from here: the contract types and tokens the library
 * commits to are published by `forty-cdk/shared`, and everything else is an
 * implementation surface refactorable without notice.
 *
 * Stability: this barrel is split into two tiers, and the boundary is
 * mechanical rather than advisory. The BLESSED tier is the curated set listed
 * in `scripts/lib/core-blessed-tier.mjs` — contract types and tokens the
 * library commits to, each published by exactly one public entry point
 * (`forty-cdk/shared` for the cross-primitive ones; `forty-cdk/visually-hidden`,
 * `forty-cdk/drawer`, and `forty-cdk/field` for the few whose semantic home is a
 * primitive). Everything else is INTERNAL. `scripts/check-entrypoint-public-types.mjs`
 * (run in `postbuild`) fails the build when an internal-tier symbol reaches a
 * public entry point's public signature, and when a blessed symbol is
 * re-exported from an entry point other than the one that publishes it — so
 * neither the tier nor the canonical import path can erode by accident.
 *
 * Class bases that public directives merely `extends` (`FormUiControlBase`,
 * `ModalSurfaceBase`, `MenuOverlayHost`, …) are deliberately internal —
 * subclassing them is not a supported contract.
 *
 * Scope: this barrel lists only what actually crosses the entry point's
 * boundary. Modules inside `core` import each other by relative path, so a
 * symbol used only within `core` does not belong here — it would enlarge the
 * internal tier every audit has to read without making anything reachable.
 * A symbol that no entry point, spec or app imports stays exported only when
 * the emitted `.d.ts` must name it (an inferred member type), and then its
 * declaration's JSDoc says which signature forces it.
 *
 * Consume primitives from their own `forty-cdk/<primitive>` entry points, not
 * from here (the main `forty-cdk` barrel is intentionally empty — see the
 * package README). Growing the blessed tier is a deliberate, reviewed act
 * documented in `.claude/rules/conventions.md`.
 */

export { accessibleTextContent } from './accessible-text/accessible-text';
export { afterNextRenderCancellable } from './after-next-render-cancellable/after-next-render-cancellable';
export { BodyScrollLock } from './body-scroll-lock/body-scroll-lock';
export { resolveConfigClass } from './class-list/resolve-config-class';
export { Collection, type CollectionHandle } from './collection/collection';
export { firstEnabledHost, nextEnabledHandle } from './collection/enabled-handle-navigation';
export {
  LabelCache,
  type LabelCacheDeps,
  type LabelCacheEntry,
  type LabelCacheHandle,
} from './collection/label-cache';
export {
  registerA11yDescription,
  registerA11yName,
  registerHandle,
} from './collection/register-handle';
export {
  assertTimeCapable,
  compareDateOf,
  type DateAdapter,
  FOR_DATE_ADAPTER,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from './date-adapter/date-adapter';
export { createFormatterCache } from './date-adapter/formatter-cache';
export { type DateRange } from './date-range/date-range';
export { DateFieldEngine } from './datetime/date-field-engine';
export { type FieldGranularity } from './datetime/date-segments';
export { ForDateTimeLiteralBase } from './datetime/literal-directive';
export { RangeFieldComposer } from './datetime/range-field-composer';
export { ForDateTimeSegmentBase, type SegmentEditorContext } from './datetime/segment-directive';
export {
  type DateSegmentType,
  type FieldSegment,
  type SegmentEditorDelegate,
  type SegmentHandle,
  type SegmentType,
} from './datetime/segment-editor';
export { type TimeSegmentType } from './datetime/segment-types';
export {
  clampToBounds,
  composeWithTime,
  secondsOfDay,
  serializeISODate,
  serializeISOTime,
  timeSentinel,
} from './datetime/serialize';
export { TimeFieldEngine } from './datetime/time-field-engine';
export { type TimeGranularity } from './datetime/time-segments';
export { FOR_TIME_VALUE_SOURCE } from './datetime/time-value-source';
export { createDefaults } from './defaults/defaults';
export { reflectDisabled } from './disabled-reflection/disabled-reflection';
export {
  DismissibleLayerStack,
  injectDismissibleLayer,
} from './dismissible-layer/dismissible-layer';
export {
  clampPreviewPosition,
  type PreviewPoint,
  resolveBoundaryElement,
} from './drag-session/clamp-preview';
export {
  type DragRect,
  type DropContainerGeometry,
  resolveDropTarget,
} from './drag-session/drag-geometry';
export { createTemplatePreview, type DragPreview } from './drag-session/drag-preview';
export { isDragLiftKey, resolveLiftedDragControl } from './drag-session/keyboard-drag-keys';
export { createKeyboardDragMediator } from './drag-session/keyboard-drag-mediator';
export { createPointerDragSession, type PointerDragSession } from './drag-session/pointer-session';
export { PreviewController } from './drag-session/preview-controller';
export { type ForDrawerSide } from './drawer-stack/drawer-side';
export {
  type DrawerStackHandle,
  type DrawerStackNode,
  ForDrawerStack,
} from './drawer-stack/drawer-stack';
export { type ElementBox, injectElementSize } from './element-size/element-size';
export {
  type FieldControlHandle,
  FOR_FIELD_CONTEXT,
  type ForFieldContext,
  injectFieldWiring,
} from './field/field-wiring';
export { FOR_FIELDSET_CONTEXT, type ForFieldsetContext } from './fieldset/fieldset-context';
export {
  AnchoredOverlayPositioningBase,
  type AnchoredPositioningSeedDefaults,
} from './floating/anchored-overlay-positioning-base';
export {
  type AnchoredPositioningContext,
  toFloatingPositioner,
} from './floating/anchored-positioning-inputs';
export {
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
} from './floating/floating';
export { findFirstFocusable } from './focus-trap/focus-trap';
export { injectHasFocusableContent } from './focusable-content/focusable-content';
export { FormUiControlBase } from './form-ui-control/form-ui-control-base';
export { mirrorUnfocusedValue } from './form-ui-control/unfocused-value-mirror';
export { TextValueControlBase } from './form-ui-control/text-value-control-base';
export { injectHiddenInput } from './hidden-input/hidden-input';
export { hostAriaLabel, hostDescribedBy, hostLabelledBy } from './host-aria/host-aria';
export { adoptHostId, hostId, resolveHostId } from './host-id/host-id';
export { hostButtonType } from './host-type/host-type';
export { createDebouncedAction, type DebouncedAction } from './hover-intent/debounced-action';
export { forceCloseWhenDisabled } from './hover-intent/force-close-when-disabled';
export { isHoverCapablePointer, isNonTouchPointer } from './hover-intent/hover-capable-pointer';
export { createHoverIntent, type HoverIntentScheduler } from './hover-intent/hover-intent';
export { SkipDelayCoordinator } from './hover-intent/skip-delay-coordinator';
export { createSkipDelayWindow } from './hover-intent/skip-delay-window';
export { FOR_ID_SALT, IdGenerator, provideForIdSalt } from './id-generator/id-generator';
export { InertSiblingsStack } from './inert-siblings/inert-siblings';
export {
  type GridNavigationAction,
  type ListNavigationAction,
  moveGridIndex,
  moveIndex,
  resolveGridNavigation,
  resolveListNavigation,
  resolveTreeExpandCollapse,
  resolveTreegridExpandCollapse,
  type WritingDirection,
} from './keyboard-navigation/keyboard-navigation';
export {
  isRangeSelectShortcut,
  resolveListTypeahead,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
} from './list-typeahead/list-typeahead';
export {
  type ListboxOverlayContext,
  ListboxOverlayController,
} from './listbox-overlay/listbox-overlay-controller';
export { LiveAnnouncer } from './live-announcer/live-announcer';
export { injectMediaQuery, injectPrefersReducedMotion } from './media-query/media-query';
export {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
  injectMenuContext,
  menuLayerNesting,
  type MenuActivationModality,
  type MenuSiblingNavigator,
} from './menu-overlay/menu-context';
export { CloseReasonState } from './overlay-controller/close-reason-state';
export { ElementRegistry } from './overlay-controller/element-registry';
export { InitialFocusState } from './overlay-controller/initial-focus-state';
export { createMenuItemList, type MenuItemHandle } from './menu-overlay/menu-item-list';
export {
  asMenuOpenerRegistration,
  type MenuOpenerOptions,
  type MenuOpenerPositioning,
  type MenuOpenerRegistration,
} from './menu-overlay/menu-opener-registry';
export { createMenuOverlay, MenuOverlay } from './menu-overlay/menu-overlay';
export { MenuOverlayHost } from './menu-overlay/menu-overlay-host';
export { MENU_POSITIONING_DEFAULTS } from './menu-overlay/menu-positioning-inputs';
export { injectModalShell } from './modal-shell/modal-shell';
export { ModalSurfaceBase } from './modal-surface-base/modal-surface-base';
export {
  type MountedWhileClosedConfig,
  warnIfMountedWhileClosed,
} from './mounted-while-closed/mounted-while-closed';
export {
  clamp,
  decimalPlaces,
  roundToDecimals,
  roundToStepPrecision,
  snapToStep,
  stepOnGrid,
} from './numeric-step/numeric-step';
export {
  OverlayManagerCore,
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
  type OverlaySurface,
} from './overlay-manager/overlay-manager';
export { OverlayRef } from './overlay-manager/overlay-ref';
export {
  injectOverlayShell,
  type OverlayShellConfig,
  type OverlayShellPositionerConfig,
} from './overlay-shell/overlay-shell';
export { injectPauseController, type PauseController } from './pausable/pause-controller';
export {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type Point,
  resolveGraceSide,
} from './pointer-grace/pointer-grace';
export {
  createPointerSuppression,
  type PointerSuppression,
} from './pointer-suppression/pointer-suppression';
export { injectPortal } from './portal/portal';
export { RangeSelectionEngine } from './range-selection/range-selection-engine';
export { clampToRange, DRAG_DEAD_ZONE_PX } from './resize-geometry/resize-geometry';
export {
  FOR_HOST_ROVING_CONTEXT,
  type HostRovingContext,
  type HostRovingItemHandle,
} from './roving-tabindex/host-roving-context';
export { rovingListTarget, rovingTabStop } from './roving-tabindex/roving-list-navigation';
export { RovingTabindex } from './roving-tabindex/roving-tabindex';
export { isScrollableAtEdge } from './scroll-boundary/scroll-boundary';
export { ScrollDismissDispatcher } from './scroll-dismiss/scroll-dismiss-dispatcher';
export {
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
} from './selection/selection';
export { createSingleSlot } from './single-slot/single-slot';
export {
  attachSwipeDismiss,
  FLICK_STALE_VELOCITY_MS,
  FLICK_VELOCITY_PX_PER_MS,
  flickVelocity,
  type SwipeDirection,
  type SwipeEventDetail,
} from './swipe-dismiss/swipe-dismiss';
export {
  injectSyntheticActivation,
  type SyntheticActivation,
  type SyntheticActivationConfig,
} from './synthetic-activation/synthetic-activation';
export {
  TABLE_REGISTRATION_CONTEXT,
  TABLE_ROW_REGISTRATION_CONTEXT,
  type ForTableCellHandle,
  type ForTableRowHandle,
  type TableRegistrationContext,
  type TableRowRegistrationContext,
  type TableVirtualRow,
  type TableVirtualRowNavigation,
  type TableVirtualWindow,
} from './table-registration/table-registration';
export { injectTextDirection } from './text-direction/text-direction';
export { findTypeaheadMatch, foldTypeaheadText } from './typeahead/match-options';
export { injectTypeahead } from './typeahead/typeahead';
export { assertInputBound, isUnset, unsetInput } from './unset-input/unset-input';
export {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from './vetoable-event/vetoable-event';
export { VirtualizedNavigator } from './virtualized-navigator/virtualized-navigator';
export {
  runVirtualizedNavigatorBridge,
  type VirtualizedNavigatorBridgeDeps,
  type VirtualizedNavigatorBridgeTarget,
} from './virtualized-navigator/virtualized-navigator-bridge';
export { ForVisuallyHidden } from './visually-hidden/visually-hidden';
export { resolveScrubReorder, translateWindowReorder } from './window-index-map/window-index-map';
