import { ErrorHandler, type Provider } from '@angular/core';

/** What {@link captureHandledErrors} returns. */
export interface HandledErrors {
  /** Every error the application `ErrorHandler` received, in arrival order. */
  readonly captured: unknown[];
  /** Installs the capturing `ErrorHandler`; add it to the `TestBed` providers. */
  readonly provider: Provider;
}

/**
 * Captures what the application `ErrorHandler` receives, so a throw that Angular routes there
 * becomes an assertion the test owns (`expect(errors.captured).toEqual([])`).
 *
 * A host listener's throw never reaches the code that dispatched the event: `dispatchEvent`
 * swallows it, and Angular hands it to the `ErrorHandler`. So `expect(() => dispatch()).not.toThrow()`
 * cannot fail, and this helper is the channel that can. Pair the provider with
 * `rethrowApplicationErrors: false` when the test asserts on a listener's throw, or `TestBed`
 * re-raises it as an unhandled error after the handler records it.
 *
 * @param into the array to record into, for a caller that owns it already.
 */
export function captureHandledErrors(into: unknown[] = []): HandledErrors {
  return {
    captured: into,
    provider: {
      provide: ErrorHandler,
      useValue: {
        handleError: (error: unknown): void => {
          into.push(error);
        },
      },
    },
  };
}
