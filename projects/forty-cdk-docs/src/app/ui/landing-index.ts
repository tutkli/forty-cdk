import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

import { DOCS_GROUPS, type DocsGroup, ENTRY_POINT_COUNT } from '../primitives';

interface IndexGroup extends DocsGroup {
  readonly id: string;
}

const GROUPS: readonly IndexGroup[] = DOCS_GROUPS.map((group) => ({
  ...group,
  id: `index-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
}));

@Component({
  selector: 'landing-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <div class="head">
      <h2 id="index-heading">Every primitive</h2>
      <span class="count">{{ count }} entry points · hover one for what it is</span>
    </div>
    @for (group of groups; track group.id) {
      <section class="group" [attr.aria-labelledby]="group.id">
        <h3 class="group-label" [attr.id]="group.id">
          {{ group.label }}
          <span class="group-count">{{ group.primitives.length }}</span>
        </h3>
        <ul class="grid">
          @for (item of group.primitives; track item.slug) {
            <li>
              <span forTooltip #tip="forTooltip" side="top" [openDelay]="300" [closeDelay]="0">
                <a forTooltipTrigger [routerLink]="['/', item.slug]">{{ item.title }}</a>
                @if (tip.open()) {
                  <div forTooltipContent class="pg-tooltip tip" animate.enter="pg-pop-in">
                    {{ item.description }}
                    <span forTooltipArrow class="pg-tooltip-arrow"></span>
                  </div>
                }
              </span>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    h2 {
      margin: 0;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
    }

    .count,
    .group-count {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .group {
      padding: 1.25rem 0 0.5rem;
      border-top: 1px solid var(--pg-border);
    }

    .group-label {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin: 0 0 0.9rem;
      font-size: 1.15rem;
      letter-spacing: -0.015em;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.55rem 2rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.9rem;
    }

    a {
      color: var(--pg-text);
      text-decoration: none;
    }

    a:hover,
    a:focus-visible {
      color: var(--pg-primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .tip {
      max-width: 320px;
    }
  `,
})
export class LandingIndex {
  protected readonly groups = GROUPS;
  protected readonly count = ENTRY_POINT_COUNT;
}
