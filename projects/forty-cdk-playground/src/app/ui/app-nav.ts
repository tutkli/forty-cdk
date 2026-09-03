import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { GUIDE_INDEX } from '../doc/guides';
import { SITE_PAGE_INDEX } from '../doc/site-pages';
import { PLAYGROUND_GROUPS } from '../primitives';

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" aria-label="Documentation">
      <div class="nav-group">
        <h2 class="nav-group-heading">Introduction</h2>
        <ul class="nav-list">
          <li>
            <a
              [routerLink]="['/']"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="pg-nav-link"
              (click)="navigate.emit()"
            >
              Overview
            </a>
          </li>
          @for (page of sitePages; track page.slug) {
            <li>
              <a
                [routerLink]="['/', page.slug]"
                routerLinkActive="active"
                class="pg-nav-link"
                (click)="navigate.emit()"
              >
                {{ page.title }}
              </a>
            </li>
          }
        </ul>
      </div>

      <div class="nav-group">
        <h2 class="nav-group-heading">Guides</h2>
        <ul class="nav-list">
          <li>
            <a
              [routerLink]="['/guides']"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              class="pg-nav-link"
              (click)="navigate.emit()"
            >
              All guides
            </a>
          </li>
          @for (group of guideGroups; track group.id) {
            @for (guide of group.guides; track guide.slug) {
              <li>
                <a
                  [routerLink]="['/guides', guide.slug]"
                  routerLinkActive="active"
                  class="pg-nav-link"
                  (click)="navigate.emit()"
                >
                  {{ guide.title }}
                </a>
              </li>
            }
          }
        </ul>
      </div>

      @for (group of groups; track group.label) {
        <div class="nav-group">
          <h2 class="nav-group-heading">{{ group.label }}</h2>
          <ul class="nav-list">
            @for (item of group.primitives; track item.slug) {
              <li>
                <a
                  [routerLink]="['/', item.slug]"
                  routerLinkActive="active"
                  class="pg-nav-link"
                  (click)="navigate.emit()"
                >
                  {{ item.title }}
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class AppNav {
  protected readonly groups = PLAYGROUND_GROUPS;
  protected readonly guideGroups = GUIDE_INDEX;
  protected readonly sitePages = SITE_PAGE_INDEX;

  readonly navigate = output<void>();
}
