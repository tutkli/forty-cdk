import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  errorCodeByCode,
  errorCodeHeadline,
  errorCodeSourceUrl,
  publishedAreaSlug,
  RUNTIME_SCOPE,
} from '../doc/error-codes';

@Component({
  selector: 'error-code-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (entry(); as found) {
      <header class="head">
        <p class="crumb"><a [routerLink]="['/errors']">Error codes</a></p>
        <h1>{{ found.code }}</h1>
        <p>
          {{ found.severity === 'warning' ? 'Warned' : 'Thrown' }} by
          @if (shared()) {
            a shared <code>forty-cdk/{{ found.area }}</code> check, which reports under the
            primitive that ran it{{ gating() }}
          } @else {
            <code>forty-cdk/{{ found.area }}</code
            >{{ gating() }}
          }
        </p>
      </header>

      <pre class="headline">{{ headline() }}</pre>

      @if (found.cause) {
        <h2>Cause</h2>
        <p>{{ found.cause }}</p>
      }

      @if (found.fix) {
        <h2>Fix</h2>
        <p>{{ found.fix }}</p>
      }

      <h2>Where it comes from</h2>
      <p>
        <a [href]="sourceUrl()" target="_blank" rel="noreferrer noopener">
          {{ found.source }}:{{ found.line }}
        </a>
      </p>

      @if (areaSlug(); as slug) {
        <p>
          <a [routerLink]="['/', slug]">Read the {{ slug }} documentation</a>
        </p>
      }

      @if (hasPlaceholder()) {
        <p class="hint">
          A value in braces is filled in when the message is reported, so the sentence in your
          console names the piece, input or value that failed.
        </p>
      }
    } @else {
      <header class="head">
        <h1>Unknown error code</h1>
        <p>
          <code>{{ code() }}</code> is not a code this version of forty-cdk reports. It may have
          been retired, or the URL may be mistyped.
        </p>
      </header>
      <p><a [routerLink]="['/errors']">Browse every error code</a></p>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 75ch;
      margin: 0 auto;
    }

    .head {
      margin-bottom: 2rem;
    }

    .crumb {
      margin: 0 0 0.75rem;
      font-size: 0.85rem;
    }

    h1 {
      margin: 0;
      font-family: var(--pg-font-mono);
      font-size: 1.4rem;
      letter-spacing: -0.01em;
    }

    h2 {
      margin: 2rem 0 0;
      font-size: 1rem;
    }

    p {
      margin: 0.5rem 0 0;
      line-height: 1.65;
      color: var(--pg-text-muted);
    }

    a {
      color: var(--pg-primary);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      font-family: var(--pg-font-mono);
      font-size: 0.9em;
      padding: 0.1em 0.35em;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-code-inline-bg);
      color: var(--pg-code-inline-fg);
    }

    .headline {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
      font-family: var(--pg-font-mono);
      font-size: 0.85rem;
      line-height: 1.6;
      white-space: pre-wrap;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      background: var(--pg-surface-2);
    }

    .hint {
      margin-top: 2rem;
      font-size: 0.9rem;
    }
  `,
})
export class ErrorCodePage {
  /** The code the route is served under, e.g. `FORCDK-DIALOG-001`. */
  readonly code = input.required<string>();

  protected readonly entry = computed(() => errorCodeByCode(this.code()));

  protected readonly headline = computed(() => {
    const entry = this.entry();
    return entry === null ? '' : errorCodeHeadline(entry);
  });

  protected readonly sourceUrl = computed(() => {
    const entry = this.entry();
    return entry === null ? '' : errorCodeSourceUrl(entry);
  });

  protected readonly areaSlug = computed(() => {
    const entry = this.entry();
    return entry === null ? null : publishedAreaSlug(entry.area);
  });

  protected readonly shared = computed(() => this.entry()?.scope === RUNTIME_SCOPE);

  /**
   * Written as interpolation rather than as template prose so the sentence keeps
   * its punctuation: a text node beside `</code>` is collapsed with a space in
   * between, which puts one before the full stop.
   */
  protected readonly gating = computed(() =>
    this.entry()?.severity === 'warning' ? ', in development builds only.' : '.',
  );

  protected readonly hasPlaceholder = computed(() => {
    const entry = this.entry();
    if (entry === null) {
      return false;
    }
    return [entry.message, entry.cause, entry.fix].some(
      (prose) => prose !== null && /\{[a-z]+\}/i.test(prose),
    );
  });
}
