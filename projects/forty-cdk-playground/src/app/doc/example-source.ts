import { InjectionToken } from '@angular/core';

export interface ExampleSource {
  readonly code: string;
  readonly highlighted: string;
}

export type ExampleSources = Record<string, ExampleSource>;

export const EXAMPLE_SOURCES = new InjectionToken<ExampleSources>('EXAMPLE_SOURCES');
