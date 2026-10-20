import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { forBreakpointsTailwind, injectBreakpoints } from 'forty-cdk/breakpoints';
import { ForVisuallyHidden } from 'forty-cdk/visually-hidden';

type TailwindName = keyof typeof forBreakpointsTailwind;

@Component({
  selector: 'app-breakpoints-active-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVisuallyHidden],
  template: `
    <div class="bp-demo">
      <div class="bp-readout">
        <span class="bp-readout-label">active breakpoint</span>
        <span class="bp-active">{{ active() ?? 'below sm' }}</span>
        <span class="bp-width">viewport {{ range() }}</span>
      </div>

      <ul class="bp-grid">
        @for (row of rows; track row.name) {
          <li class="bp-cell" [class.bp-cell--on]="row.up()">
            <span class="bp-name">{{ row.name }}</span>
            <span class="bp-min">≥ {{ row.min }}px</span>
            <span class="bp-flags">
              <span class="bp-flag" [class.bp-flag--on]="row.up()">
                <span aria-hidden="true">{{ row.up() ? '✓' : '✕' }}</span>
                up
                <span forVisuallyHidden>{{ row.up() ? 'matches' : 'does not match' }}</span>
              </span>
              <span class="bp-flag" [class.bp-flag--on]="row.only()">
                <span aria-hidden="true">{{ row.only() ? '✓' : '✕' }}</span>
                only
                <span forVisuallyHidden>{{ row.only() ? 'matches' : 'does not match' }}</span>
              </span>
            </span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

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
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface, #ffffff);
    }

    .bp-readout-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ex-muted, #585d66);
    }

    .bp-active {
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 1.9rem;
      font-weight: 700;
      line-height: 1.1;
      color: var(--ex-accent, #0e7c6b);
    }

    .bp-width {
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
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
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
      background: var(--ex-surface, #ffffff);
      transition: border-color 0.15s ease;
    }

    .bp-cell--on {
      border-color: var(--ex-accent, #0e7c6b);
    }

    .bp-name {
      flex: none;
      width: 3rem;
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-weight: 700;
    }

    .bp-min {
      flex: 1;
      font-size: 0.82rem;
      color: var(--ex-muted, #585d66);
    }

    .bp-flags {
      flex: none;
      display: flex;
      gap: 0.35rem;
    }

    .bp-flag {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      font-family: var(--ex-font-mono, ui-monospace, monospace);
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--ex-surface-2, #f2eee6);
      color: var(--ex-muted, #585d66);
    }

    .bp-flag--on {
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 16%, transparent);
      color: var(--ex-accent, #0e7c6b);
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

  protected readonly rows = (Object.keys(forBreakpointsTailwind) as TailwindName[]).map((name) => ({
    name,
    min: forBreakpointsTailwind[name],
    up: this.bp.up(name),
    only: this.bp.only(name),
  }));

  protected readonly range = computed(() => {
    const index = this.rows.findIndex((row) => row.name === this.active());
    const from = this.rows[index]?.min ?? 0;
    const to = this.rows[index + 1]?.min;
    return to === undefined ? `${from}px and up` : `${from}px to ${to - 1}px`;
  });
}
