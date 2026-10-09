import {
  type ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/**
 * Error handler that records every reported error onto a globalThis-scoped
 * array, reports it to the E2E error gate when Playwright has exposed one, and
 * still logs it to the devtools console (default behaviour). E2E specs read
 * `window.__fortyCdkHarnessErrors` to assert directives that throw at runtime —
 * geometry-driven validation in particular runs inside `afterNextRender` and is
 * reported through `ErrorHandler`, not as an uncaught `pageerror`, so
 * Playwright cannot pick it up otherwise.
 *
 * Uses `globalThis` rather than `window` to satisfy the workspace's
 * `no-restricted-globals` rule (which targets library code for SSR safety
 * and is shared across the whole repo). The harness is browser-only so
 * either reference would work at runtime; `globalThis` keeps the lint
 * config simple without a per-file disable.
 */
class CapturingErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const g = globalThis as unknown as {
      __fortyCdkHarnessErrors?: string[];
      __fortyCdkReportHarnessError?: (message: string) => Promise<void>;
    };
    const message = error instanceof Error ? error.message : String(error);
    (g.__fortyCdkHarnessErrors ??= []).push(message);
    void g.__fortyCdkReportHarnessError?.(message);
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: CapturingErrorHandler },
  ],
};
