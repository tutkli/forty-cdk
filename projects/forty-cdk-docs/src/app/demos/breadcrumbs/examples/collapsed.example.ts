import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';

interface Crumb {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-breadcrumbs-collapsed-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs ariaLabel="Project files" class="bc">
      <ol class="bc-list">
        @for (crumb of visible(); track crumb.href; let last = $last; let first = $first) {
          @if (!first) {
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

          @if (first && expanded()) {
            @for (hidden of middle(); track hidden.href) {
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
              <li class="bc-li">
                <a
                  forBreadcrumbItem
                  class="bc-link"
                  [href]="hidden.href"
                  (click)="$event.preventDefault()"
                >
                  {{ hidden.label }}
                </a>
              </li>
            }
          } @else if (first) {
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
            <li class="bc-li">
              <button
                type="button"
                class="bc-ellipsis"
                aria-label="Show hidden path segments"
                (click)="expanded.set(true)"
              >
                …
              </button>
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
      justify-content: center;
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
      color: var(--ex-muted, #585d66);
      text-decoration: none;
      border-radius: var(--ex-radius-sm, 14px);
      padding: 0.15rem 0.4rem;
    }

    .bc-link:hover {
      color: var(--ex-text, #17191c);
      text-decoration: underline;
    }

    .bc-link[aria-current='page'] {
      color: var(--ex-text, #17191c);
      font-weight: 700;
      pointer-events: none;
    }

    .bc-ellipsis {
      font: inherit;
      line-height: 1;
      padding: 0.05rem 0.45rem 0.3rem;
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface-2, #f2eee6);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      cursor: pointer;
    }

    .bc-ellipsis:hover {
      color: var(--ex-text, #17191c);
      border-color: var(--ex-border-strong, #d0c9bc);
    }

    .bc-sep {
      display: inline-flex;
      align-items: center;
      color: var(--ex-border-strong, #d0c9bc);
      user-select: none;
    }

    .bc-sep svg {
      width: 14px;
      height: 14px;
      display: block;
    }
  `,
})
export class BreadcrumbsCollapsedExample {
  protected readonly expanded = signal(false);

  protected readonly trail = signal<readonly Crumb[]>([
    { label: 'Home', href: '/' },
    { label: 'Workspace', href: '/workspace' },
    { label: 'Projects', href: '/workspace/projects' },
    { label: 'forty-cdk', href: '/workspace/projects/forty-cdk' },
    { label: 'Docs', href: '/workspace/projects/forty-cdk/docs' },
    { label: 'Breadcrumbs', href: '/workspace/projects/forty-cdk/docs/breadcrumbs' },
  ]);

  protected readonly visible = computed<readonly Crumb[]>(() => {
    const trail = this.trail();
    return [trail[0]!, ...trail.slice(-2)];
  });

  protected readonly middle = computed<readonly Crumb[]>(() => this.trail().slice(1, -2));
}
