/**
 * Shared contract suites for behavioural surfaces that recur across
 * 5+ primitives — form-control flags, roving tabindex, dismissible
 * layer, the anchored-overlay trigger ARIA trio, the `data-state`
 * styling vocabulary, consumer-set static attribute adoption, the
 * single-value selection / open-item model shape.
 *
 * Each contract owns the assertions that are identical across every
 * primitive in its family. Migration is incremental: when a primitive's
 * spec is touched for any reason, replace its inline contract block
 * with the shared call.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */
export {
  assertFormControlContract,
  type FormControlFlag,
  type FormControlMountResult,
  type FormControlContractOptions,
} from './form-control-contract';

export {
  assertRovingTabindexContract,
  type RovingTabindexMountResult,
  type RovingTabindexContractSetup,
  type RovingTabindexContractOptions,
} from './roving-tabindex-contract';

export {
  assertOverlayTriggerAriaContract,
  type OverlayTriggerAriaMountResult,
  type OverlayTriggerAriaContractOptions,
} from './overlay-trigger-aria-contract';

export {
  assertDataStateContract,
  DOCUMENTED_DATA_STATE_VOCABULARIES,
  type DataStateMountResult,
  type DataStateContractSetup,
  type DataStateContractOptions,
} from './data-state-contract';

export {
  assertDismissibleLayerContract,
  type DismissibleLayerMountOptions,
  type DismissibleLayerMountResult,
  type DismissibleLayerContractSetup,
  type DismissibleLayerContractOptions,
} from './dismissible-layer-contract';

export {
  assertSingleValueModelContract,
  type SingleValueSelectionAttribute,
  type SingleValueModelMountResult,
  type SingleValueModelContractSetup,
  type SingleValueModelContractOptions,
} from './single-value-model-contract';

export {
  assertStaticAdoptionContract,
  type StaticAdoptionChannel,
  type StaticAdoptionSeam,
  type StaticAdoptionFallback,
  type StaticAdoptionClaim,
  type StaticAdoptionMountResult,
  type StaticAdoptionContractSetup,
  type StaticAdoptionContractOptions,
} from './static-adoption-contract';
