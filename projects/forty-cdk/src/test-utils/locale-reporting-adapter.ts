import { inject, Injectable, type Provider, signal } from '@angular/core';

import { NativeDateAdapter } from 'forty-cdk/shared';
import { FOR_DATE_ADAPTER } from 'forty-cdk/date-adapter';

/**
 * A `NativeDateAdapter` whose `locale()` reads a writable signal, standing in
 * for an app adapter that formats in the active language. Starts at `'en-US'`.
 */
@Injectable()
export class LocaleReportingAdapter extends NativeDateAdapter {
  readonly reported = signal<string | null>('en-US');

  override locale(): string | null {
    return this.reported();
  }
}

/** Provides a fresh {@link LocaleReportingAdapter} as the active `DateAdapter`. */
export function provideLocaleReportingAdapter(): Provider[] {
  return [{ provide: FOR_DATE_ADAPTER, useClass: LocaleReportingAdapter }];
}

/** Injects the {@link LocaleReportingAdapter} provided by {@link provideLocaleReportingAdapter}. */
export function injectLocaleReportingAdapter(): LocaleReportingAdapter {
  return inject(FOR_DATE_ADAPTER) as LocaleReportingAdapter;
}
