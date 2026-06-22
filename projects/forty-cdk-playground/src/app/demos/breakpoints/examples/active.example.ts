import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { breakpointsTailwind, injectBreakpoints } from 'forty-cdk/breakpoints';

import { DemoLayout } from '../../../ui/demo-layout';

type TailwindName = keyof typeof breakpointsTailwind;

@Component({
  selector: 'app-breakpoints-active-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Active breakpoint"
      subtitle="injectBreakpoints() reads the breakpoint map from the ambient provider (the Tailwind scale by default) so call sites never repeat it. Every query method returns a Signal<boolean> backed by a MediaQueryList; active() is the largest breakpoint whose min-width currently matches, or null below the smallest. Resize the browser window to watch them update live."
      sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/active.example.ts"
    >
      <div demo class="bp-demo">
        <div class="bp-readout">
          <span class="bp-readout-label">active breakpoint</span>
          <span class="bp-active">{{ active() ?? 'below sm' }}</span>
          <span class="bp-width">viewport ≈ {{ width() }}px</span>
        </div>

        <ul class="bp-grid">
          @for (row of rows; track row.name) {
            <li class="bp-cell" [class.bp-cell--on]="row.up()">
              <span class="bp-name">{{ row.name }}</span>
              <span class="bp-min">≥ {{ row.min }}px</span>
              <span class="bp-flags">
                <span class="bp-flag" [class.bp-flag--on]="row.up()">up</span>
                <span class="bp-flag" [class.bp-flag--on]="row.only()">only</span>
              </span>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          active: <b>{{ active() ?? 'null' }}</b
          ><br />
          up('md'): <b>{{ bp.up('md')() }}</b
          ><br />
          between('md','xl'): <b>{{ bp.between('md', 'xl')() }}</b
          ><br />
          down('lg'): <b>{{ bp.down('lg')() }}</b>
        </p>
        <p class="pg-hint">
          The flags reflect up(name) (the breakpoint and wider) and only(name) (its own band). They
          are live signals, so resizing the window re-evaluates them with no extra wiring.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .bp-demo {
      width: min(520px, 100%);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .bp-readout {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .bp-readout-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--pg-text-muted);
    }

    .bp-active {
      font-family: var(--pg-font-mono);
      font-size: 1.9rem;
      font-weight: 700;
      line-height: 1.1;
      color: var(--pg-primary);
    }

    .bp-width {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .bp-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .bp-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
      opacity: 0.5;
      transition:
        opacity 0.15s ease,
        border-color 0.15s ease;
    }

    .bp-cell--on {
      opacity: 1;
      border-color: var(--pg-primary);
    }

    .bp-name {
      flex: none;
      width: 3rem;
      font-family: var(--pg-font-mono);
      font-weight: 700;
    }

    .bp-min {
      flex: 1;
      font-size: 0.82rem;
      color: var(--pg-text-muted);
    }

    .bp-flags {
      flex: none;
      display: flex;
      gap: 0.35rem;
    }

    .bp-flag {
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      font-family: var(--pg-font-mono);
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--pg-surface-2);
      color: var(--pg-text-muted);
    }

    .bp-flag--on {
      background: color-mix(in srgb, var(--pg-primary) 16%, transparent);
      color: var(--pg-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      .bp-cell {
        transition: none;
      }
    }
  `,
})
export class BreakpointsActiveExample {
  protected readonly bp = injectBreakpoints();
  protected readonly active = this.bp.active;

  protected readonly rows = (Object.keys(breakpointsTailwind) as TailwindName[]).map((name) => ({
    name,
    min: breakpointsTailwind[name],
    up: this.bp.up(name),
    only: this.bp.only(name),
  }));

  protected readonly width = signal(globalThis.innerWidth);

  constructor() {
    const onResize = (): void => this.width.set(globalThis.innerWidth);
    globalThis.addEventListener('resize', onResize, { passive: true });
    inject(DestroyRef).onDestroy(() => globalThis.removeEventListener('resize', onResize));
  }
}
