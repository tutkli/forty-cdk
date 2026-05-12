import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter } from '@analogjs/router';
import { withInMemoryScrolling } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    /*
     * `anchorScrolling: 'enabled'` lets `[routerLink]="[]" [fragment]="..."`
     * in the TOC scroll to the heading natively (and handles deep-link
     * visits with `#fragment` in the URL). `scroll-margin-top` on the
     * headings clears the sticky header.
     */
    provideFileRouter(
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideContent(withMarkdownRenderer()),
  ],
};
