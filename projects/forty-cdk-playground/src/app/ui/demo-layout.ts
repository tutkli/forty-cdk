import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { GITHUB_BLOB_BASE } from './github';
import { Icon } from './icon';

@Component({
  selector: 'playground-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <header class="head">
      <div class="head-text">
        <h2>{{ title() }}</h2>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <a class="source" [href]="sourceUrl()" target="_blank" rel="noreferrer noopener">
        <app-icon name="github" />
        Source
      </a>
    </header>

    <div class="body">
      <section class="preview" aria-label="Preview">
        <ng-content select="[demo]" />
      </section>
      <aside class="panel" aria-label="Controls">
        <h3>Controls</h3>
        <ng-content select="[controls]" />
      </aside>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .head h2 {
      margin: 0;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.35rem 0 0;
      max-width: 62ch;
      font-size: 0.92rem;
      color: var(--pg-text-muted);
    }

    .source {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    .source app-icon {
      width: 16px;
      height: 16px;
    }

    .source:hover {
      color: var(--pg-text);
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

    .panel h3 {
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
      }

      .head h2 {
        font-size: 1.05rem;
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
  readonly subtitle = input<string>('');
  readonly sourcePath = input.required<string>();

  protected readonly sourceUrl = computed(() => GITHUB_BLOB_BASE + this.sourcePath());
}
