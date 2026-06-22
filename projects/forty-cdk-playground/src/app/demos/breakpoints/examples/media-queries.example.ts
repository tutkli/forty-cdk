import { ChangeDetectionStrategy, Component, type Signal } from '@angular/core';
import { injectBreakpoints } from 'forty-cdk/breakpoints';

import { DemoLayout } from '../../../ui/demo-layout';

interface Probe {
  readonly query: string;
  readonly on: string;
  readonly off: string;
  readonly matches: Signal<boolean>;
}

@Component({
  selector: 'app-breakpoints-media-queries-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout],
  template: `
    <playground-demo
      title="Arbitrary media queries"
      subtitle="matches(query) is the escape hatch for any media feature the named width helpers don't cover — orientation, pointer, hover, and the prefers-* user settings. Each call returns a live Signal<boolean> from the same cached MediaQueryList layer, so it composes exactly like up() / down() / between()."
      sourcePath="projects/forty-cdk-playground/src/app/demos/breakpoints/examples/media-queries.example.ts"
    >
      <div demo class="bp-probes-wrap">
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

      <div controls class="pg-controls">
        <p class="pg-hint">
          Try rotating a device, switching your OS to dark mode, or enabling "reduce motion" — these
          read the OS / browser setting directly, independent of the playground's own theme toggle.
        </p>
        <p class="pg-hint">
          On the server (or where matchMedia is unavailable) every signal reads false, so matches()
          stays SSR-safe.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
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
