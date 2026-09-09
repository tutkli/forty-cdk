import { LocationStrategy } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { GITHUB_REPO } from './github';

@Component({
  selector: 'landing-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="bar">
      <span class="note">MIT-licensed · built for Angular 22+</span>
      <div class="links">
        <a [routerLink]="['/errors']">Error codes</a>
        <a [href]="repo" target="_blank" rel="noreferrer noopener">GitHub</a>
        <a [href]="npm" target="_blank" rel="noreferrer noopener">npm</a>
        <a class="mono" [href]="llmsTxt" target="_blank" rel="noreferrer noopener">llms.txt</a>
      </div>
    </div>
  `,
  styles: `
    :host {
      flex: none;
      display: block;
      border-top: 1px solid var(--pg-border);
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.75rem 2rem 2.25rem;
      font-size: 0.85rem;
    }

    .note {
      color: var(--pg-text-muted);
    }

    .links {
      display: flex;
      align-items: center;
      gap: 1.4rem;
      margin-left: auto;
    }

    .links a {
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    .links a:hover {
      color: var(--pg-text);
    }

    .mono {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
    }

    @media (max-width: 820px) {
      .bar {
        padding: 1.5rem 1rem 2rem;
      }

      .links {
        margin-left: 0;
      }
    }
  `,
})
export class LandingFooter {
  protected readonly repo = GITHUB_REPO;
  protected readonly npm = 'https://www.npmjs.com/package/forty-cdk';
  protected readonly llmsTxt = inject(LocationStrategy).prepareExternalUrl('/llms.txt');
}
