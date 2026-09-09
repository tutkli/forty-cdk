import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'landing-specimen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch],
  template: `
    <div class="head">
      <span class="dot" aria-hidden="true"></span>
      <span class="live">Live</span>
      <code class="entry">forty-cdk/switch</code>
    </div>
    <div class="row">
      <button forSwitch class="switch" [(checked)]="enabled" aria-label="Notifications">
        <span class="switch__thumb"></span>
      </button>
      <code class="state">
        data-state="<strong>{{ enabled() ? 'checked' : 'unchecked' }}</strong
        >"
      </code>
    </div>
    <pre class="code">{{ snippet }}</pre>
    <p class="note">
      One directive on your own <code>&lt;button&gt;</code>. It carries <code>role="switch"</code>,
      keeps <code>aria-checked</code> in step, toggles on <kbd>Space</kbd> and <kbd>Enter</kbd>, and
      reflects its state for your CSS. The appearance above is thirty lines of ordinary CSS.
    </p>
  `,
  styles: `
    :host {
      display: block;
      padding: 1.6rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-lg);
      corner-shape: squircle;
      box-shadow: var(--pg-shadow);
    }

    .head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--pg-primary);
    }

    .live {
      font-size: 0.78rem;
      font-weight: 700;
    }

    .entry {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--pg-text-muted);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.75rem 0 1.5rem;
    }

    .switch {
      flex: none;
      width: 56px;
      height: 32px;
      padding: 3px;
      border: none;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: pointer;
      transition: background 160ms;
    }

    .switch__thumb {
      display: block;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.28);
      transition: transform 200ms var(--pg-ease-spring);
    }

    .switch[data-state='checked'] {
      background: var(--pg-primary);
    }

    .switch[data-state='checked'] .switch__thumb {
      transform: translateX(24px);
    }

    .state {
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    .state strong {
      color: var(--pg-text);
    }

    .code {
      margin: 0;
      padding: 1rem 1.1rem;
      overflow-x: auto;
      background: var(--pg-bg);
      border-radius: var(--pg-radius-sm);
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      line-height: 1.7;
    }

    .note {
      margin: 1.1rem 0 0;
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .note code {
      padding: 0.05em 0.35em;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-code-inline-bg);
      color: var(--pg-code-inline-fg);
    }

    code {
      font-family: var(--pg-font-mono);
      font-size: 0.86em;
    }

    kbd {
      font-family: var(--pg-font-mono);
      font-size: 0.8em;
      padding: 0.1em 0.4em;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border-strong);
    }
  `,
})
export class LandingSpecimen {
  protected readonly enabled = signal(true);

  protected readonly snippet = [
    '<button forSwitch type="button"',
    '        [(checked)]="on">',
    '  <span class="thumb"></span>',
    '</button>',
  ].join('\n');
}
