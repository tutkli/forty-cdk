import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ERROR_CODE_AREAS, ERROR_CODE_INDEX } from '../doc/error-codes';

@Component({
  selector: 'errors-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="head">
      <h1>Error codes</h1>
      <p>
        Every message forty-cdk reports carries a <code>FORCDK-&lt;AREA&gt;-&lt;NNN&gt;</code> code
        naming one concrete mistake. This is the whole roster — {{ total }} codes across
        {{ areas.length }} entry points — read from the library's own source, so a page says what
        the console said.
      </p>
      <p class="hint">
        A value in braces, like <code>{{ placeholder }}</code
        >, is filled in when the message is reported.
      </p>
    </header>

    @for (area of areas; track area.area) {
      <section class="area">
        <h2 [id]="area.area">forty-cdk/{{ area.area }}</h2>
        <ul class="codes">
          @for (entry of area.codes; track entry.code) {
            <li>
              <a [routerLink]="['/errors', entry.code]">{{ entry.code }}</a>
              <span class="message">{{ entry.message }}</span>
              @if (entry.severity === 'warning') {
                <span class="warning">warning</span>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 900px;
      margin: 0 auto;
    }

    .head {
      margin-bottom: 2.5rem;
    }

    h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.75rem 0 0;
      max-width: 70ch;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .hint {
      font-size: 0.9rem;
    }

    code {
      font-family: var(--pg-font-mono);
      font-size: 0.9em;
      padding: 0.1em 0.35em;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-code-inline-bg);
      color: var(--pg-code-inline-fg);
    }

    .area {
      margin-bottom: 2rem;
    }

    .area h2 {
      margin: 0 0 0.75rem;
      font-family: var(--pg-font-mono);
      font-size: 1rem;
      font-weight: 700;
      scroll-margin-top: calc(var(--pg-header-height) + 1rem);
    }

    .codes {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.5rem;
    }

    .codes li {
      display: grid;
      grid-template-columns: 15rem minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: baseline;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      background: var(--pg-surface);
    }

    .codes a {
      font-family: var(--pg-font-mono);
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .codes a:hover {
      text-decoration: underline;
    }

    .message {
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .warning {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-warning);
    }

    @media (max-width: 820px) {
      h1 {
        font-size: 1.35rem;
      }

      .codes li {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.25rem;
      }
    }
  `,
})
export class ErrorsPage {
  protected readonly areas = ERROR_CODE_AREAS;
  protected readonly total = ERROR_CODE_INDEX.length;

  /**
   * Interpolated rather than written into the template: a literal `{` opens an
   * ICU message to the template parser, which refuses the whole component.
   */
  protected readonly placeholder = '{piece}';
}
