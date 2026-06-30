import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { PLAYGROUND_GROUPS } from '../primitives';

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" aria-label="Primitives">
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

  readonly navigate = output<void>();
}
