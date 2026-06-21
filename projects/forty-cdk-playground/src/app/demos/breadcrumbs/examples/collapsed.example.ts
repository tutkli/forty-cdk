import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbs, ForBreadcrumbSeparator } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Crumb {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-breadcrumbs-collapsed-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForBreadcrumbs,
    ForBreadcrumbItem,
    ForBreadcrumbSeparator,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Collapsing a long trail"
      subtitle="The primitive renders whatever items you give it, so collapsing a deep path is a consumer decision. Here the middle is folded into an expandable ellipsis button that reveals the hidden crumbs — the trail stays a single accessible navigation landmark either way."
      sourcePath="projects/forty-cdk-playground/src/app/demos/breadcrumbs/examples/collapsed.example.ts"
    >
      <div demo>
        <nav forBreadcrumbs ariaLabel="Project files" class="bc">
          <ol class="bc-list">
            @for (crumb of visible(); track crumb.href; let last = $last; let first = $first) {
              @if (!first) {
                <li forBreadcrumbSeparator class="bc-sep">
                  <app-icon name="chevron-right" />
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

              @if (first && collapsed() && expanded()) {
                @for (hidden of middle(); track hidden.href) {
                  <li forBreadcrumbSeparator class="bc-sep">
                    <app-icon name="chevron-right" />
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
              } @else if (first && collapsed()) {
                <li forBreadcrumbSeparator class="bc-sep">
                  <app-icon name="chevron-right" />
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
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="Long path (collapse middle)" [(checked)]="collapsed" />

        <p class="pg-hint">
          Toggle a deep path on and off. When collapsed, click the … to reveal the folded crumbs.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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

    .bc-ellipsis {
      font: inherit;
      line-height: 1;
      padding: 0.05rem 0.45rem 0.3rem;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .bc-ellipsis:hover {
      color: var(--pg-text);
      border-color: var(--pg-border-strong);
    }

    .bc-sep {
      display: inline-flex;
      align-items: center;
      color: var(--pg-border-strong);
      user-select: none;
    }

    .bc-sep app-icon {
      width: 14px;
      height: 14px;
    }
  `,
})
export class BreadcrumbsCollapsedExample {
  protected readonly collapsed = signal(true);
  protected readonly expanded = signal(false);

  protected readonly trail = signal<readonly Crumb[]>([
    { label: 'Home', href: '/' },
    { label: 'Workspace', href: '/workspace' },
    { label: 'Projects', href: '/workspace/projects' },
    { label: 'forty-cdk', href: '/workspace/projects/forty-cdk' },
    { label: 'Playground', href: '/workspace/projects/forty-cdk/playground' },
    { label: 'Breadcrumbs', href: '/workspace/projects/forty-cdk/playground/breadcrumbs' },
  ]);

  protected readonly visible = computed<readonly Crumb[]>(() => {
    const trail = this.trail();
    if (!this.collapsed()) {
      return trail;
    }
    return [trail[0]!, ...trail.slice(-2)];
  });

  protected readonly middle = computed<readonly Crumb[]>(() => this.trail().slice(1, -2));
}
