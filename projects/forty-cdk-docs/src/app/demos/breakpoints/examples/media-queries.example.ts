import { ChangeDetectionStrategy, Component, type Signal } from '@angular/core';
import { injectBreakpoints } from 'forty-cdk/breakpoints';

interface Probe {
  readonly query: string;
  readonly on: string;
  readonly off: string;
  readonly matches: Signal<boolean>;
}

@Component({
  selector: 'app-breakpoints-media-queries-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bp-probes-wrap">
      <ul class="bp-probes">
        @for (probe of probes; track probe.query) {
          <li class="bp-probe">
            <code class="bp-query">{{ probe.query }}</code>
            <span class="bp-result" [class.bp-result--on]="probe.matches()">
              {{ probe.matches() ? probe.on : probe.off }}
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

    .bp-probes-wrap {
      width: min(520px, 100%);
    }

    .bp-probes {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .bp-probe {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.6rem 0.85rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .bp-query {
      font-family: var(--pg-font-mono);
      font-size: 0.8rem;
      color: var(--pg-text);
    }

    .bp-result {
      flex: none;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      font-family: var(--pg-font-mono);
      font-size: 0.74rem;
      font-weight: 700;
      background: var(--pg-surface-2);
      color: var(--pg-text-muted);
    }

    .bp-result--on {
      background: color-mix(in srgb, var(--pg-success) 18%, transparent);
      color: var(--pg-success);
    }
  `,
})
export class BreakpointsMediaQueriesExample {
  private readonly bp = injectBreakpoints();

  protected readonly probes: readonly Probe[] = (
    [
      ['(orientation: landscape)', 'landscape', 'portrait'],
      ['(prefers-color-scheme: dark)', 'dark', 'light'],
      ['(pointer: coarse)', 'coarse / touch', 'fine / mouse'],
      ['(hover: hover)', 'can hover', 'no hover'],
      ['(prefers-reduced-motion: reduce)', 'reduced', 'no preference'],
    ] as const
  ).map(([query, on, off]) => ({ query, on, off, matches: this.bp.matches(query) }));
}
