import { OverlayRef } from 'forty-cdk/core';

/**
 * Handle returned by `ForDrawerManager.open()`. Inject inside the opened
 * component to drive close imperatively. Both reactive (`isClosed`, `result`)
 * and awaitable (`closed`) APIs are exposed — pick what fits the call site.
 *
 * `R` is the close-result type. Default `unknown`; specify it on
 * `manager.open<C, R>(...)` to get type safety.
 */
export class ForDrawerRef<R = unknown> extends OverlayRef<R> {}
