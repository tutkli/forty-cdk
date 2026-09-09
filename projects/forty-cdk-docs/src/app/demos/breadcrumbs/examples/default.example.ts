import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';

interface Crumb {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-breadcrumbs-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs class="bc">
      <ol class="bc-list">
        @for (crumb of crumbs(); track crumb.href; let last = $last) {
          <li class="bc-li">
            <a
              forBreadcrumbItem
              class="bc-link"
              [href]="crumb.href"
              [current]="last"
              (click)="$event.preventDefault()"
            >
              {{ crumb.label }}
            </a>
          </li>
          @if (!last) {
            <li forBreadcrumbSeparator class="bc-sep">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </li>
          }
        }
      </ol>
    </nav>
  `,
  styles: `
    :host {
      display: contents;
    }

    .bc {
      width: 100%;
    }

    .bc-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.9rem;
    }

    .bc-li {
      display: inline-flex;
    }

    .bc-link {
      color: var(--pg-text-muted);
      text-decoration: none;
      border-radius: var(--pg-radius-sm);
      padding: 0.15rem 0.4rem;
      transition: color 0.15s ease;
    }

    .bc-link:hover {
      color: var(--pg-text);
      text-decoration: underline;
    }

    .bc-link[aria-current='page'] {
      color: var(--pg-text);
      font-weight: 700;
      pointer-events: none;
    }

    .bc-sep {
      display: inline-flex;
      align-items: center;
      color: var(--pg-border-strong);
      user-select: none;
    }

    .bc-sep svg {
      width: 14px;
      height: 14px;
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      .bc-link {
        transition: none;
      }
    }
  `,
})
export class BreadcrumbsDefaultExample {
  protected readonly crumbs = signal<readonly Crumb[]>([
    { label: 'Home', href: '/' },
    { label: 'Components', href: '/components' },
    { label: 'Navigation', href: '/components/navigation' },
    { label: 'Breadcrumbs', href: '/components/navigation/breadcrumbs' },
  ]);
}
