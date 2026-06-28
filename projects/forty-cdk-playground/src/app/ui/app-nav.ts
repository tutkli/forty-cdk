import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import { filter } from 'rxjs';

import { PLAYGROUND_GROUPS } from '../primitives';
import { Icon } from './icon';

function groupForUrl(url: string): string | null {
  const slug = url.replace(/^\//, '').split(/[#?/]/)[0];
  for (const group of PLAYGROUND_GROUPS) {
    if (group.primitives.some((primitive) => primitive.slug === slug)) {
      return group.label;
    }
  }
  return null;
}

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    ForAccordion,
    ForAccordionItem,
    ForAccordionTrigger,
    ForAccordionContent,
    Icon,
  ],
  template: `
    <nav forAccordion class="nav" [multiple]="true" [(value)]="openGroups" aria-label="Primitives">
      @for (group of groups; track group.label) {
        <div forAccordionItem class="nav-group" [value]="group.label">
          <h2 class="nav-group-heading">
            <button type="button" forAccordionTrigger class="nav-group-trigger">
              <span>{{ group.label }}</span>
              <app-icon class="nav-chevron" name="chevron-down" />
            </button>
          </h2>
          <div forAccordionContent class="nav-group-content">
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
        </div>
      }
    </nav>
  `,
})
export class AppNav {
  protected readonly groups = PLAYGROUND_GROUPS;

  readonly navigate = output<void>();

  protected readonly openGroups = signal<readonly string[]>(
    PLAYGROUND_GROUPS.map((group) => group.label),
  );

  constructor() {
    const router = inject(Router);
    router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const group = groupForUrl(event.urlAfterRedirects);
        if (group && !this.openGroups().includes(group)) {
          this.openGroups.update((open) => [...open, group]);
        }
      });
  }
}
