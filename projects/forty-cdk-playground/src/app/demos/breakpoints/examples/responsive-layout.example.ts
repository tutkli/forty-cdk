import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { injectBreakpoints } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

interface Card {
  readonly title: string;
  readonly tag: string;
}

@Component({
  selector: 'app-breakpoints-responsive-layout-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Responsive layout"
      subtitle="The idiomatic use: derive UI from the breakpoint inside computed() and @if instead of repeating media queries in the template. The card grid picks its column count from up('md') / up('lg') / up('xl'), and the sidebar is only mounted at lg and wider. The handle reacts to the window viewport, so resize the browser to watch the layout adapt."
      sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/responsive-layout.example.ts"
    >
      <div demo class="bp-shell-wrap">
        <div class="bp-shell">
          @if (showSidebar()) {
            <aside class="bp-sidebar">
              <span class="bp-sidebar-title">Sidebar</span>
              <span class="bp-sidebar-note">mounted ≥ lg</span>
            </aside>
          }
          <main class="bp-main">
            <div
              class="bp-cards"
              [style.grid-template-columns]="'repeat(' + columns() + ', minmax(0, 1fr))'"
            >
              @for (card of cards; track card.title) {
                <article class="bp-card">
                  <span class="bp-card-title">{{ card.title }}</span>
                  <span class="bp-card-tag">{{ card.tag }}</span>
                </article>
              }
            </div>
          </main>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          columns: <b>{{ columns() }}</b
          ><br />
          sidebar: <b>{{ showSidebar() ? 'shown' : 'hidden' }}</b>
        </p>
        <p class="pg-hint">
          columns = up('xl') ? 4 : up('lg') ? 3 : up('md') ? 2 : 1. The returned handle captures its
          injection context, so the query methods compose freely inside a computed() — not only
          during construction.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .bp-shell-wrap {
      width: min(560px, 100%);
    }

    .bp-shell {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface-2);
    }

    .bp-sidebar {
      flex: none;
      width: 7rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.85rem;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .bp-sidebar-title {
      font-weight: 700;
    }

    .bp-sidebar-note {
      font-family: var(--pg-font-mono);
      font-size: 0.7rem;
      opacity: 0.85;
    }

    .bp-main {
      flex: 1;
      min-width: 0;
    }

    .bp-cards {
      display: grid;
      gap: 0.5rem;
    }

    .bp-card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.85rem 0.75rem;
      min-height: 4.5rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .bp-card-title {
      font-weight: 600;
      font-size: 0.88rem;
    }

    .bp-card-tag {
      font-family: var(--pg-font-mono);
      font-size: 0.7rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class BreakpointsResponsiveLayoutExample {
  private readonly bp = injectBreakpoints();

  protected readonly columns = computed(() =>
    this.bp.up('xl')() ? 4 : this.bp.up('lg')() ? 3 : this.bp.up('md')() ? 2 : 1,
  );
  protected readonly showSidebar = this.bp.up('lg');

  protected readonly cards: readonly Card[] = [
    { title: 'Overview', tag: 'dashboard' },
    { title: 'Traffic', tag: 'analytics' },
    { title: 'Revenue', tag: 'finance' },
    { title: 'Sessions', tag: 'realtime' },
    { title: 'Signups', tag: 'growth' },
    { title: 'Churn', tag: 'retention' },
  ];
}
