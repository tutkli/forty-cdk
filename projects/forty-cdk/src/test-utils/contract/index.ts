/**
 * Shared contract suites for behavioural surfaces that recur across
 * 5+ primitives — form-control flags, roving tabindex, dismissable
 * layer.
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
  assertDismissableLayerContract,
  type DismissableLayerMountOptions,
  type DismissableLayerMountResult,
  type DismissableLayerContractSetup,
} from './dismissable-layer-contract';
