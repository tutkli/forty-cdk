import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PRIMITIVES, UTILITIES } from '../primitives';

@Component({
  selector: 'landing-index',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="head">
      <h2 id="index-heading">Every primitive</h2>
      <span class="count">
        {{ primitives.length }} primitives · {{ utilities.length }} utilities
      </span>
    </div>
    <ul class="grid">
      @for (item of primitives; track item.slug) {
        <li>
          <a [routerLink]="['/', item.slug]">{{ item.title }}</a>
        </li>
      }
    </ul>
    <p class="utilities">
      <span class="utilities-label">Utilities</span>
      @for (item of utilities; track item.slug) {
        <a [routerLink]="['/', item.slug]">{{ item.title }}</a>
        @if (!$last) {
          <span class="sep" aria-hidden="true">·</span>
        }
      }
    </p>
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
      margin-bottom: 1.25rem;
    }

    h2 {
      margin: 0;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
    }

    .count,
    .utilities-label {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
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

    .utilities {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      margin: 1.5rem 0 0;
      padding-top: 1.25rem;
      border-top: 1px solid var(--pg-border);
      font-size: 0.9rem;
    }

    .utilities-label {
      margin-right: 0.4rem;
      font-size: 0.75rem;
      color: var(--pg-secondary);
    }

    a {
      color: var(--pg-text);
      text-decoration: none;
    }

    a:hover {
      color: var(--pg-primary);
    }

    .grid a:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .sep {
      color: var(--pg-text-muted);
    }
  `,
})
export class LandingIndex {
  protected readonly primitives = PRIMITIVES;
  protected readonly utilities = UTILITIES;
}
