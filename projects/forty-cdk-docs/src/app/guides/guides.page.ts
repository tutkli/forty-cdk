import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GUIDE_INDEX } from '../doc/guides';

@Component({
  selector: 'guides-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="head">
      <h1>Guides</h1>
      <p>
        Cross-cutting documentation that spans primitives — how to style a headless library, how to
        wrap primitives in a design system, and the deeper table and virtualization compositions.
      </p>
    </header>

    @for (group of groups; track group.id) {
      <section class="group">
        <h2>{{ group.label }}</h2>
        <ul class="cards">
          @for (guide of group.guides; track guide.slug) {
            <li>
              <a class="card" [routerLink]="['/guides', guide.slug]">
                <span class="card-title">{{ guide.title }}</span>
                @if (guide.description) {
                  <span class="card-desc">{{ guide.description }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 1180px;
      margin: 0 auto;
    }

    .head {
      margin-bottom: 2.5rem;
    }

    .head h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.5rem 0 0;
      max-width: 65ch;
      color: var(--pg-text-muted);
    }

    .group {
      margin-bottom: 2.5rem;
    }

    .group h2 {
      margin: 0 0 1rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      height: 100%;
      padding: 0.9rem 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      text-decoration: none;
    }

    .card:hover {
      border-color: var(--pg-border-strong);
      background: var(--pg-surface-2);
    }

    .card-title {
      font-weight: 700;
      color: var(--pg-text);
    }

    .card-desc {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }
  `,
})
export class GuidesPage {
  protected readonly groups = GUIDE_INDEX;
}
