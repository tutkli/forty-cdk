import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h1>Page not found</h1>
    <p>
      That URL does not match a primitive, a guide or one of this site's own pages. It may have
      moved — the library is pre-1.0 and entry points still get renamed.
    </p>
    <ul class="links">
      <li><a [routerLink]="['/']">Start from the home page</a></li>
      <li><a [routerLink]="['/getting-started']">Getting started</a></li>
      <li><a [routerLink]="['/guides']">Browse the guides</a></li>
    </ul>
    <p class="hint">Or press <kbd>⌘K</kbd> to search every page.</p>
  `,
  styles: `
    :host {
      display: block;
      max-width: 65ch;
      margin: 0 auto;
      padding: 3rem 0;
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    p {
      margin: 0.75rem 0 0;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .links {
      margin: 1.5rem 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.5rem;
    }

    .links a {
      font-weight: 700;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .links a:hover {
      text-decoration: underline;
    }

    .hint {
      font-size: 0.9rem;
    }

    kbd {
      font-family: var(--pg-font-mono);
      font-size: 0.85em;
      padding: 0.1em 0.4em;
      border-radius: 6px;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border-strong);
    }
  `,
})
export class NotFoundPage {}
