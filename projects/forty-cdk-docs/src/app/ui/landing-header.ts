import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GITHUB_REPO } from './github';
import { Icon } from './icon';
import { SITE_SECTIONS } from './site-sections';
import { ThemeToggle } from './theme-toggle';

@Component({
  selector: 'landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, ThemeToggle],
  template: `
    <div class="bar">
      <span class="brand-name">forty-cdk</span>

      <nav class="links" aria-label="Sections">
        @for (link of links; track link.path) {
          <a [routerLink]="link.path">{{ link.label }}</a>
        }
      </nav>

      <div class="actions">
        <a
          class="pg-icon-btn"
          [href]="repo"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub repository"
        >
          <app-icon name="github" />
        </a>
        <theme-toggle />
      </div>
    </div>
  `,
  styles: `
    :host {
      flex: none;
      display: block;
      border-bottom: 1px solid var(--pg-border);
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 2rem;
      max-width: 1200px;
      height: var(--pg-header-height);
      margin: 0 auto;
      padding: 0 2rem;
    }

    .brand-name {
      font-family: var(--pg-font-display);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      white-space: nowrap;
    }

    .links {
      display: flex;
      align-items: center;
      gap: 1.4rem;
    }

    .links a {
      font-size: 0.9rem;
      font-weight: 700;
      white-space: nowrap;
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    .links a:hover {
      color: var(--pg-text);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-left: auto;
    }

    @media (max-width: 820px) {
      .bar {
        gap: 1rem;
        padding: 0 1rem;
      }

      .links {
        display: none;
      }
    }
  `,
})
export class LandingHeader {
  protected readonly repo = GITHUB_REPO;
  protected readonly links = SITE_SECTIONS;
}
