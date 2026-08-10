/*
 * Internal shared surface of forty-cdk — the `forty-cdk/core` entry point.
 *
 * This entry point holds the cross-primitive DI singletons (`LiveAnnouncer`,
 * the focus-trap stack, the id-generator salt, the defaults registry), the
 * framework-free geometry / interaction helpers, and the cross-cutting public
 * tokens.
 *
 * It exists so that every primitive entry point can import the shared core by
 * the `forty-cdk/core` specifier and the bundler compiles it exactly ONCE —
 * never duplicated per primitive, which would split the DI singletons into
 * multiple instances and break cross-primitive coordination.
 *
 * The overlay machinery — the positioning engine, both shells, the
 * dismissible-layer / inert-siblings / body-scroll-lock / drawer stacks, the
 * menu and listbox overlay controllers, the imperative manager core, the
 * portal and the hover-intent schedulers — is NOT here. It ships as
 * `forty-cdk/core-overlay`, whose barrel header records why
 * ([#1723](https://github.com/tutkli/forty-cdk/issues/1723)). The edge runs
 * one way only: that entry point imports this one, and nothing here may import
 * it back — a single reverse edge merges the two chunks and undoes the split.
 *
 * THIS ENTRY POINT IS NOT PUBLIC. It carries no semver guarantees and is
 * exported only so forty-cdk's own entry points share one compiled module.
 * Consumers never import from here: the contract types and tokens the library
 * commits to are published by `forty-cdk/shared`, and everything else is an
 * implementation surface refactorable without notice.
 *
 * Stability: this barrel is split into two tiers, and the boundary is
 * mechanical rather than advisory — and it spans `forty-cdk/core-overlay`'s
 * barrel too, which is why the gate reads both. The BLESSED tier is the
 * curated set listed
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
 * boundary — which now includes what `forty-cdk/core-overlay` reads, so a
 * symbol exported solely for that entry point (`injectFocusTrap`, the
 * `composed-tree` walkers, `MODAL_PEER_ATTRIBUTE`) belongs here. Modules
 * inside `core` import each other by relative path, so a
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
export { Collection, type CollectionHandle } from './collection/collection';
export {
  firstEnabledHandle,
  firstEnabledHost,
  lastEnabledHandle,
  lastEnabledHost,
  nextEnabledHandle,
} from './collection/enabled-handle-navigation';
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
export { createSingleSlot } from './collection/single-slot';
export {
  composedClosest,
  composedContains,
  composedParentElement,
  resolveActiveElement,
  resolveEventTarget,
} from './composed-tree/composed-tree';
export {
  assertTimeCapable,
  compareDateOf,
  type DateAdapter,
  FOR_DATE_ADAPTER,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from './datetime/date-adapter';
export { DateFieldEngine } from './datetime/date-field-engine';
export { type DateRange } from './datetime/date-range';
export { type FieldGranularity } from './datetime/date-segments';
export { createFormatterCache } from './datetime/formatter-cache';
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
export {
  createPointerDragSession,
  DRAG_DEAD_ZONE_PX,
  type PointerDragSession,
} from './drag-session/pointer-session';
export { PreviewController } from './drag-session/preview-controller';
export { resolveScrubReorder, translateWindowReorder } from './drag-session/window-index-map';
export { type ElementBox, injectElementSize } from './element-size/element-size';
export { formatFortyMessage, fortyError, type FortyMessageSpec, fortyWarn } from './errors/errors';
export {
  orphanContextError,
  type OrphanContextSpec,
  unresolvedRootError,
  type UnresolvedRootSpec,
} from './errors/orphan-context';
export {
  type FieldControlHandle,
  FOR_FIELD_CONTEXT,
  type ForFieldContext,
  injectFieldWiring,
} from './field/field-wiring';
export { FOR_FIELDSET_CONTEXT, type ForFieldsetContext } from './field/fieldset-context';
export { findFirstFocusable, injectFocusTrap } from './focus-trap/focus-trap';
export { injectHasFocusableContent } from './focus-trap/focusable-content';
export { FormUiControlBase } from './form-ui-control/form-ui-control-base';
export { injectHiddenInput } from './form-ui-control/hidden-input';
export { TextValueControlBase } from './form-ui-control/text-value-control-base';
export { mirrorUnfocusedValue } from './form-ui-control/unfocused-value-mirror';
export { resolveConfigClass } from './host-attributes/config-class';
export { reflectDisabled } from './host-attributes/disabled-reflection';
export { hostAriaLabel, hostDescribedBy, hostLabelledBy } from './host-attributes/host-aria';
export { adoptHostId, hostId, resolveHostId } from './host-attributes/host-id';
export { hostButtonType } from './host-attributes/host-type';
export { MODAL_EXEMPT_ATTRIBUTE, MODAL_PEER_ATTRIBUTE } from './host-attributes/modal-attributes';
export { FOR_ID_SALT, IdGenerator, provideForIdSalt } from './id-generator/id-generator';
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
export { LiveAnnouncer } from './live-announcer/live-announcer';
export { injectMediaQuery, injectPrefersReducedMotion } from './media-query/media-query';
export {
  clamp,
  decimalPlaces,
  roundToDecimals,
  roundToStepPrecision,
  snapToStep,
  stepOnGrid,
} from './numeric-step/numeric-step';
export { injectPauseController, type PauseController } from './pausable/pause-controller';
export { isHoverCapablePointer, isNonTouchPointer } from './pointer/pointer-capability';
export { createPointerSuppression, type PointerSuppression } from './pointer/pointer-suppression';
export { assertRootContext } from './root-context/root-context';
export {
  FOR_HOST_ROVING_CONTEXT,
  type HostRovingContext,
  type HostRovingItemHandle,
} from './roving-tabindex/host-roving-context';
export {
  rovingListTarget,
  rovingTabStop,
  selectionTabStop,
} from './roving-tabindex/roving-list-navigation';
export { RovingTabindex } from './roving-tabindex/roving-tabindex';
export { RangeSelectionEngine } from './selection/range-selection-engine';
export {
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
} from './selection/selection';
export { isScrollableAtEdge } from './swipe-dismiss/scroll-boundary';
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
  type ForTableCellHandle,
  type ForTableRowHandle,
  TABLE_REGISTRATION_CONTEXT,
  TABLE_ROW_REGISTRATION_CONTEXT,
  type TableRegistrationContext,
  type TableRowRegistrationContext,
  type TableVirtualRow,
  type TableVirtualRowNavigation,
  type TableVirtualWindow,
} from './table-registration/table-registration';
export { injectTextDirection } from './text-direction/text-direction';
export {
  isRangeSelectShortcut,
  resolveListTypeahead,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
} from './typeahead/list-typeahead';
export { findTypeaheadMatch, foldTypeaheadText } from './typeahead/match-options';
export { injectTypeahead, type Typeahead } from './typeahead/typeahead';
export { assertInputBound, isUnset, unsetInput } from './unset-input/unset-input';
export {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from './vetoable-event/vetoable-event';
export {
  VirtualizedNavigator,
  type VirtualizedNavigatorDeps,
} from './virtualized-navigator/virtualized-navigator';
export {
  runVirtualizedNavigatorBridge,
  type VirtualizedNavigatorBridgeDeps,
  type VirtualizedNavigatorBridgeTarget,
} from './virtualized-navigator/virtualized-navigator-bridge';
export { ForVisuallyHidden } from './visually-hidden/visually-hidden';
