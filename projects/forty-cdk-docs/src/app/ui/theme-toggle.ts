import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

import { Icon } from './icon';
import { SiteChrome } from './site-chrome';

/**
 * The theme control, rendered only in the browser
 * ([#1896](https://github.com/tutkli/forty-cdk/issues/1896)).
 *
 * A prerendered page knows nothing about the visitor, so a prerendered switch
 * would ship its off state — `aria-checked="false"` and a label promising the
 * opposite of what pressing it does — onto a page the inline bootstrap already
 * painted dark. The server emits a same-size placeholder instead, and
 * `ngSkipHydration` lets the client build the real control rather than try to
 * reconcile it with the placeholder.
 */
@Component({
  selector: 'theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch, Icon],
  host: { ngSkipHydration: 'true' },
  template: `
    @if (browser) {
      <button
        forSwitch
        type="button"
        class="pg-icon-btn"
        [checked]="chrome.dark()"
        (checkedChange)="chrome.setDark($event)"
        [attr.aria-label]="chrome.themeLabel()"
      >
        <app-icon [name]="chrome.dark() ? 'sun' : 'moon'" />
      </button>
    } @else {
      <span class="pg-icon-btn" aria-hidden="true"></span>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class ThemeToggle {
  protected readonly chrome = inject(SiteChrome);
  protected readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
}
