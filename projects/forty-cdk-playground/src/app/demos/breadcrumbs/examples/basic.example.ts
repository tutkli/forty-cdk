import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForBreadcrumbItem, ForBreadcrumbSeparator, ForBreadcrumbs } from 'forty-cdk/breadcrumbs';

import { ControlSelect, type ControlOption } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Crumb {
  readonly label: string;
  readonly href: string;
}

type SeparatorStyle = 'chevron' | 'slash';

@Component({
  selector: 'app-breadcrumbs-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForBreadcrumbs,
    ForBreadcrumbItem,
    ForBreadcrumbSeparator,
    ControlSelect,
    Icon,
  ],
  template: `
    <playground-demo
      title="A breadcrumb trail"
      subtitle="A labelled navigation landmark wrapping a set of links. The last crumb carries current, which reflects aria-current='page' so assistive tech announces it as the current location; the separators are aria-hidden, so screen readers skip them."
      sourcePath="projects/forty-cdk-playground/src/app/demos/breadcrumbs/examples/basic.example.ts"
    >
      <div demo>
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
                  @if (separator() === 'chevron') {
                    <app-icon name="chevron-right" />
                  } @else {
                    /
                  }
                </li>
              }
            }
          </ol>
        </nav>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="Separator" [options]="separatorOptions" [(value)]="separator" />

        <p class="pg-state">
          current: <b>{{ current() }}</b>
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

    .bc-sep app-icon {
      width: 14px;
      height: 14px;
    }

    @media (prefers-reduced-motion: reduce) {
      .bc-link {
        transition: none;
      }
    }
  `,
})
export class BreadcrumbsBasicExample {
  protected readonly crumbs = signal<readonly Crumb[]>([
    { label: 'Home', href: '/' },
    { label: 'Components', href: '/components' },
    { label: 'Navigation', href: '/components/navigation' },
    { label: 'Breadcrumbs', href: '/components/navigation/breadcrumbs' },
  ]);

  protected readonly separator = signal<SeparatorStyle>('chevron');

  protected readonly separatorOptions: readonly ControlOption<SeparatorStyle>[] = [
    { value: 'chevron', label: 'Chevron' },
    { value: 'slash', label: 'Slash' },
  ];

  protected readonly current = computed(() => this.crumbs().at(-1)?.label ?? '—');
}
