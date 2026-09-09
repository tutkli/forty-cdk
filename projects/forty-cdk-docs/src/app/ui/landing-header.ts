import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FIRST_PRIMITIVE_SLUG } from '../primitives';
import { GITHUB_REPO } from './github';
import { Icon } from './icon';
import { ThemeToggle } from './theme-toggle';

@Component({
  selector: 'landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, ThemeToggle],
  template: `
    <div class="bar">
      <div class="brand">
        <span class="brand-name">forty-cdk</span>
        <span class="brand-licence">MIT</span>
      </div>

      <nav class="links" aria-label="Sections">
        <a [routerLink]="['/installation']">Docs</a>
        <a [routerLink]="['/guides']">Guides</a>
        <a [routerLink]="['/', firstPrimitive]">Primitives</a>
        <a [routerLink]="['/errors']">Error codes</a>
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
      height: 68px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .brand {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .brand-name {
      font-family: var(--pg-font-display);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.03em;
    }

    .brand-licence {
      font-family: var(--pg-font-mono);
      font-size: 0.75rem;
      color: var(--pg-text-muted);
    }

    .links {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      font-size: 0.95rem;
    }

    .links a {
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
  protected readonly firstPrimitive = FIRST_PRIMITIVE_SLUG;
}
