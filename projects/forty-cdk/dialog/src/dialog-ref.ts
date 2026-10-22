import { OverlayRef } from 'forty-cdk/core-overlay';

import type { ForDialogCloseReason } from './dialog-context';

/**
 * Handle returned by `ForDialogManager.open()`. Inject inside the opened
 * component to drive close imperatively. Both reactive (`isClosed`, `result`)
 * and awaitable (`closed`) APIs are exposed — pick what fits the call site.
 *
 * `R` is the close-result type: the result the opened component declares through
 * `FOR_DIALOG_CONTRACT`, else `unknown` unless `manager.open<C, R>(...)` names it.
 * `closed` resolves with `{ reason, result }` — the `reason` is a `ForDialogCloseReason` telling
 * apart an imperative `close()` (`'programmatic'`) from Escape / backdrop /
 * outside / close-button dismissals.
 */
export class ForDialogRef<R = unknown> extends OverlayRef<R, ForDialogCloseReason> {}
