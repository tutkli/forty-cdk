import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteChrome } from './site-chrome';
import { SITE_SECTIONS } from './site-sections';

@Component({
  selector: 'section-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="switcher" aria-label="Sections">
      @for (section of sections; track section.id) {
        <a
          [routerLink]="section.path"
          [attr.aria-current]="section.id === chrome.section() ? 'true' : null"
        >
          {{ section.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }

    .switcher {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.4rem;
    }

    a {
      padding-bottom: 3px;
      border-bottom: 2px solid transparent;
      font-size: 0.9rem;
      font-weight: 700;
      white-space: nowrap;
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    a:hover {
      color: var(--pg-text);
    }

    a[aria-current] {
      color: var(--pg-text);
      border-bottom-color: var(--pg-primary);
    }
  `,
})
export class SectionSwitcher {
  protected readonly chrome = inject(SiteChrome);
  protected readonly sections = SITE_SECTIONS;
}
