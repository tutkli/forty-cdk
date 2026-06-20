/**
 * Combobox-local re-exports of the shared snapshot-fold helpers. The single
 * sources live in `_internal/`: `tryReadHandle` (the NG0950 read guard) in
 * `_internal/signal-graph/read-handle.ts` and `foldSnapshotOnTotalCountTransition`
 * (the `totalCount`-reset `linkedSignal` fold) in
 * `_internal/collection/fold-snapshot.ts`. Kept as a barrel so `OptionLabelCache`
 * and the combobox virtualized navigator import from one combobox-local path.
 */
export { tryReadHandle } from '../_internal/signal-graph/read-handle';
export { foldSnapshotOnTotalCountTransition } from '../_internal/collection/fold-snapshot';
