import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'playground-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div class="head-text">
        <h1>{{ title() }}</h1>
        @if (summary()) {
          <p>{{ summary() }}</p>
        }
      </div>
      @if (apgUrl()) {
        <a class="apg" [href]="apgUrl()" target="_blank" rel="noreferrer noopener">
          WAI-ARIA APG ↗
        </a>
      }
    </header>

    <div class="body">
      <section class="preview" aria-label="Preview">
        <ng-content select="[demo]" />
      </section>
      <aside class="panel" aria-label="Controls">
        <h2>Controls</h2>
        <ng-content select="[controls]" />
      </aside>
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 980px;
      margin: 0 auto;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .head h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.4rem 0 0;
      max-width: 60ch;
      color: var(--pg-text-muted);
    }

    .apg {
      flex: none;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .apg:hover {
      text-decoration: underline;
    }

    .body {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 1.5rem;
      align-items: start;
    }

    .preview {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 2rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .panel {
      padding: 1.1rem 1.2rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .panel h2 {
      margin: 0 0 1rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    @media (max-width: 820px) {
      .head {
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
      }

      .head h1 {
        font-size: 1.35rem;
      }

      .body {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .preview {
        min-height: 220px;
        padding: 1.25rem;
      }
    }
  `,
})
export class DemoLayout {
  readonly title = input.required<string>();
  readonly summary = input<string>('');
  readonly apgUrl = input<string>('');
}
