import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  template: `
    <div class="head">
      <h2 id="index-heading">Every primitive</h2>
      <span class="count">{{ count }} entry points</span>
    </div>
    @for (group of groups; track group.id) {
      <section class="group" [attr.aria-labelledby]="group.id">
        <h3 class="group-label" [attr.id]="group.id">
          {{ group.label }}
          <span class="group-count">{{ group.primitives.length }}</span>
        </h3>
        <ul class="list">
          @for (item of group.primitives; track item.slug) {
            <li class="entry">
              <a [routerLink]="['/', item.slug]">{{ item.title }}</a>
              <span class="desc">{{ item.description }}</span>
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
      margin-bottom: 0.75rem;
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
      padding: 1.5rem 0 0.75rem;
      border-top: 1px solid var(--pg-border);
    }

    .group-label {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin: 0 0 1.1rem;
      font-size: 1.3rem;
      letter-spacing: -0.015em;
    }

    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.1rem 2.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .entry {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .entry a {
      align-self: flex-start;
      font-family: var(--pg-font-display);
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--pg-text);
      text-decoration: none;
    }

    .entry a:hover {
      color: var(--pg-primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .desc {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }
  `,
})
export class LandingIndex {
  protected readonly groups = GROUPS;
  protected readonly count = ENTRY_POINT_COUNT;
}
