import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

import { Icon } from './icon';
import { SiteChrome } from './site-chrome';

@Component({
  selector: 'theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch, Icon],
  template: `
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
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class ThemeToggle {
  protected readonly chrome = inject(SiteChrome);
}
