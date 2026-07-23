/*
 * Internal shared surface of forty-cdk — the `forty-cdk/core` entry point.
 *
 * This entry point holds everything formerly under `src/lib/_internal/`: the
 * cross-primitive DI singletons (`LiveAnnouncer`, focus-trap / dismissable-layer
 * / inert-siblings / drawer stacks, the id-generator salt, the defaults
 * registry), the framework-free geometry / interaction / overlay helpers, and
 * the cross-cutting public tokens.
 *
 * It exists so that every primitive entry point can import the shared core by
 * the `forty-cdk/core` specifier and the bundler compiles it exactly ONCE —
 * never duplicated per primitive, which would split the DI singletons into
 * multiple instances and break cross-primitive coordination.
 *
 * Stability: the symbols re-exported here carry NO semver guarantees. They are
 * an internal composition surface shared between forty-cdk's own entry points,
 * not a supported public API. Consume primitives from their own
 * `forty-cdk/<primitive>` entry points, not from here (the main `forty-cdk`
 * barrel is intentionally empty — see the package README).
 */

export { BodyScrollLock } from './body-scroll-lock/body-scroll-lock';
export { resolveConfigClass } from './class-list/resolve-config-class';
export { Collection, type CollectionHandle } from './collection/collection';
export { type DisableableHandle, firstEnabledHost } from './collection/first-enabled-host';
export { foldSnapshotOnTotalCountTransition } from './collection/fold-snapshot';
export {
  type A11yDescriptionOwner,
  type A11yLabelOwner,
  registerA11yDescription,
  registerA11yName,
  registerCollectionHandle,
  registerHandle,
  type RegistrationScheduling,
} from './collection/register-handle';
export {
  assertTimeCapable,
  compareDateOf,
  type DateAdapter,
  FOR_DATE_ADAPTER,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from './date-adapter/date-adapter';
export { type DateRange } from './date-range/date-range';
export {
  DateFieldEngine,
  type DateFieldEngineConfig,
  type DateTimeParts,
} from './datetime/date-field-engine';
export {
  buildDateTimeSegments,
  buildSegments,
  type FieldGranularity,
} from './datetime/date-segments';
export { dayPeriodNames, from12, resolveHourCycle, to12 } from './datetime/hour-cycle';
export { ForDateTimeLiteralBase } from './datetime/literal-directive';
export {
  RangeFieldComposer,
  type RangeFieldComposerConfig,
  type RangeFieldEndpoint,
  type RangeFieldEndpointEngine,
} from './datetime/range-field-composer';
export { ForDateTimeSegmentBase, type SegmentEditorContext } from './datetime/segment-directive';
export {
  type DateSegmentType,
  type EditableSpec,
  type FieldSegment,
  type FieldSpec,
  type LiteralSpec,
  SegmentEditor,
  type SegmentEditorHost,
  type SegmentHandle,
  type SegmentParts,
  type SegmentType,
} from './datetime/segment-editor';
export { type TimeSegmentType } from './datetime/segment-types';
export {
  clampToBounds,
  composeWithTime,
  type DateSerializeGranularity,
  secondsOfDay,
  serializeISODate,
  serializeISOTime,
  timeSentinel,
  type TimeSerializeGranularity,
} from './datetime/serialize';
export {
  TimeFieldEngine,
  type TimeFieldEngineConfig,
  type TimeParts,
} from './datetime/time-field-engine';
export { buildTimeSegments, type TimeGranularity } from './datetime/time-segments';
export { FOR_TIME_VALUE_SOURCE, type TimeValueSource } from './datetime/time-value-source';
export { createDefaults } from './defaults/defaults';
export { reflectDisabled } from './disabled-reflection/disabled-reflection';
export {
  DismissableLayer,
  type DismissableLayerActivateOptions,
  type DismissableLayerChannel,
  DismissableLayerStack,
  injectDismissableLayer,
} from './dismissable-layer/dismissable-layer';
export {
  type AutoScroller,
  type AutoScrollerConfig,
  type AutoScrollVelocity,
  computeScrollVelocity,
  createAutoScroller,
  findScrollContainer,
} from './drag-session/auto-scroll';
export {
  clampPreviewPosition,
  type PreviewPoint,
  type PreviewSize,
} from './drag-session/clamp-preview';
export {
  type DragRect,
  type DropContainerGeometry,
  type DropTarget,
  resolveDropTarget,
} from './drag-session/drag-geometry';
export {
  buildDragSlots,
  type DragSlot,
  indexOfSlot,
  stepSlot,
} from './drag-session/drag-positions';
export {
  createDragPreview,
  createTemplatePreview,
  type DragPreview,
  wrapPreview,
} from './drag-session/drag-preview';
export {
  FLIP_ANIMATING_ATTR,
  flipDelta,
  type FlipDelta,
  type FlipRect,
  playFlip,
  type PlayFlipConfig,
} from './drag-session/flip';
export { createPointerHandleGuard, type PointerHandleGuard } from './drag-session/handle-guard';
export { isDragLiftKey, resolveLiftedDragControl } from './drag-session/keyboard-drag-keys';
export {
  createKeyboardDragMediator,
  type KeyboardDragMediatorConfig,
} from './drag-session/keyboard-drag-mediator';
export {
  fencePlaceholderIndex,
  placeholderInsertion,
  type PlaceholderInsertion,
} from './drag-session/placeholder-position';
export {
  createPointerDragSession,
  type PointerDragSession,
  type PointerDragSessionOptions,
} from './drag-session/pointer-session';
export {
  PreviewController,
  type PreviewControllerOptions,
} from './drag-session/preview-controller';
export {
  gapFromPointerY,
  levelFromPointerX,
  resolveDropIndicator,
  resolveTreeDrop,
  type TreeDropIndicator,
  type TreeDropRow,
  type TreeDropTarget,
} from './drag-session/tree-drop-resolver';
export {
  type ForDrawerScaleConfig,
  ForDrawerScaleCoordinator,
} from './drawer-scale/drawer-scale-coordinator';
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
export { computeFlatHierarchy } from './flat-hierarchy/flat-hierarchy';
export {
  ANCHORED_POSITIONING_DEFAULTS,
  type AnchoredPositioningContext,
  toFloatingPositioner,
} from './floating/anchored-positioning-inputs';
export {
  type FloatingAlign,
  type FloatingConfig,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
  injectFloating,
} from './floating/floating';
export { FOCUSABLE_SELECTOR } from './focusable-candidate/focusable-candidate';
export { findFirstFocusable } from './focus-trap/focus-trap';
export { injectHasFocusableContent } from './focusable-content/focusable-content';
export { FormUiControlBase } from './form-ui-control/form-ui-control-base';
export { mirrorUnfocusedValue } from './form-ui-control/unfocused-value-mirror';
export { TextValueControlBase } from './form-ui-control/text-value-control-base';
export { type HiddenInputConfig, injectHiddenInput } from './hidden-input/hidden-input';
export { adoptHostId, hostId, resolveHostId } from './host-id/host-id';
export { createDebouncedAction, type DebouncedAction } from './hover-intent/debounced-action';
export {
  forceCloseWhenDisabled,
  type ForceCloseWhenDisabledOptions,
} from './hover-intent/force-close-when-disabled';
export {
  createHoverIntent,
  type HoverIntentCoordinator,
  type HoverIntentOptions,
  type HoverIntentScheduler,
} from './hover-intent/hover-intent';
export {
  SkipDelayCoordinator,
  type SkipDelayCoordinatorDefaults,
} from './hover-intent/skip-delay-coordinator';
export { FOR_ID_SALT, IdGenerator, provideForIdSalt } from './id-generator/id-generator';
export {
  type InertSiblingsHandle,
  InertSiblingsStack,
  MODAL_EXEMPT_ATTRIBUTE,
  MODAL_PEER_ATTRIBUTE,
} from './inert-siblings/inert-siblings';
export {
  type ExpandCollapseAction,
  type GridNavigationAction,
  type GridNavigationOptions,
  type ListNavigationAction,
  type ListNavigationOptions,
  type ListOrientation,
  moveGridIndex,
  type MoveGridIndexOptions,
  moveIndex,
  type MoveIndexOptions,
  resolveGridNavigation,
  resolveListNavigation,
  resolveTreeExpandCollapse,
  resolveTreegridExpandCollapse,
  type TreeExpandCollapseOptions,
  type WritingDirection,
} from './keyboard-navigation/keyboard-navigation';
export {
  nextEnabledHandle,
  type NextEnabledHandleOptions,
} from './keyboard-navigation/move-in-collection';
export {
  type ListboxOverlayContext,
  ListboxOverlayController,
  type ListboxOverlayControllerDeps,
  type ListboxOverlayEmitTargets,
  type ListboxOverlayOptionHandle,
} from './listbox-overlay/listbox-overlay-controller';
export { LiveAnnouncer } from './live-announcer/live-announcer';
export {
  localeSeparators,
  type LocaleSeparators,
  parseLocaleNumber,
} from './locale-number/locale-number';
export { injectMediaQuery, injectPrefersReducedMotion } from './media-query/media-query';
export {
  FOR_MENU_CONTEXT,
  type ForMenuCloseReason,
  type ForMenuContext,
  type ForMenuItemHandle,
  injectMenuContext,
  type MenuActivationModality,
  type MenuSiblingNavigator,
} from './menu-overlay/menu-context';
export { CloseReasonState } from './overlay-controller/close-reason-state';
export {
  AnchorSlot,
  ElementRegistry,
  ElementSlot,
  IdentifiedElementSlot,
} from './overlay-controller/element-registry';
export { InitialFocusState } from './overlay-controller/initial-focus-state';
export {
  createMenuItemList,
  type MenuItemHandle,
  MenuItemList,
} from './menu-overlay/menu-item-list';
export {
  createMenuOverlay,
  MenuOverlay,
  type MenuOverlayCloseReason,
  type MenuOverlayHooks,
  type MenuOverlayItemHandle,
} from './menu-overlay/menu-overlay';
export { MenuOverlayHost } from './menu-overlay/menu-overlay-host';
export { MENU_POSITIONING_DEFAULTS } from './menu-overlay/menu-positioning-inputs';
export {
  injectModalShell,
  type ModalShellConfig,
  type ModalShellDismissConfig,
  type ModalShellHandle,
  type ModalShellInitialFocusConfig,
  resolveModalExemptOverlays,
} from './modal-shell/modal-shell';
export {
  clamp,
  decimalPlaces,
  roundToDecimals,
  roundToStepPrecision,
  snapToStep,
} from './numeric-step/numeric-step';
export {
  type OverlayManagerConfig,
  OverlayManagerCore,
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
} from './overlay-manager/overlay-manager';
export { type OverlayCloseEvent, OverlayRef } from './overlay-manager/overlay-ref';
export {
  injectOverlayShell,
  type OverlayShellConfig,
  type OverlayShellDismissConfig,
  type OverlayShellInitialFocusConfig,
  type OverlayShellInitialFocusMove,
  type OverlayShellPositionerConfig,
  type OverlayShellReturnFocusConfig,
} from './overlay-shell/overlay-shell';
export {
  injectPauseController,
  type PauseController,
  type PauseControllerOptions,
} from './pausable/pause-controller';
export {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  type GraceRect,
  isPointInPolygon,
  type Point,
  type Polygon,
  resolveGraceSide,
} from './pointer-grace/pointer-grace';
export {
  createPointerSuppression,
  DEFAULT_POINTER_SUPPRESSION_MS,
  type PointerSuppression,
} from './pointer-suppression/pointer-suppression';
export { injectPortal, type PortalConfig } from './portal/portal';
export { clampToRange, DRAG_DEAD_ZONE_PX } from './resize-geometry/resize-geometry';
export {
  FOR_HOST_ROVING_CONTEXT,
  type HostRovingContext,
  type HostRovingItemHandle,
} from './roving-tabindex/host-roving-context';
export {
  reconcileRovingActive,
  type ReconcileRovingActiveOptions,
} from './roving-tabindex/reconcile-roving-active';
export { RovingTabindex } from './roving-tabindex/roving-tabindex';
export { isScrollableAtEdge } from './scroll-boundary/scroll-boundary';
export {
  attachScrollDismiss,
  DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS,
  type ScrollDismiss,
  type ScrollDismissOptions,
} from './scroll-dismiss/scroll-dismiss';
export { ScrollDismissDispatcher } from './scroll-dismiss/scroll-dismiss-dispatcher';
export {
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
} from './selection/selection';
export { isRequiredInputUnset, tryReadHandle } from './signal-graph/read-handle';
export {
  resolveSnapTarget,
  type ResolveSnapTargetOptions,
  type SnapResolution,
} from './snap-points/snap-points';
export {
  attachSwipeDismiss,
  type SwipeDirection,
  type SwipeDismissOptions,
  type SwipeEventDetail,
} from './swipe-dismiss/swipe-dismiss';
export { injectTextDirection } from './text-direction/text-direction';
export {
  findTypeaheadMatch,
  foldTypeaheadText,
  type TypeaheadMatchQuery,
} from './typeahead/match-options';
export { injectTypeahead, Typeahead, type TypeaheadOptions } from './typeahead/typeahead';
export {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from './vetoable-event/vetoable-event';
export {
  readEntryGuarded,
  VirtualizedNavigator,
  type VirtualizedNavigatorAccessors,
  type VirtualizedNavigatorDeps,
  type VirtualizedNavigatorEntry,
  type VirtualizedNavigatorOptions,
} from './virtualized-navigator/virtualized-navigator';
export { ForVisuallyHidden, VISUALLY_HIDDEN_STYLE } from './visually-hidden/visually-hidden';
export {
  resolveScrubReorder,
  type ScrubReorderParams,
  translateWindowReorder,
  type WindowReorderResult,
} from './window-index-map/window-index-map';
