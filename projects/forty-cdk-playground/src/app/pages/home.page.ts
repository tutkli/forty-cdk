import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ForSwitch } from 'forty-cdk/switch';

import { PLAYGROUND_GROUPS } from '../primitives';
import { GITHUB_REPO } from '../ui/github';

interface Trait {
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ForSwitch],
  template: `
    <section class="hero">
      <div class="hero-text">
        <h1>Headless UI primitives for modern Angular.</h1>
        <p class="lede">
          forty-cdk ships the part that is hard to get right — roles, keyboard interaction, focus
          management and state — and none of the part that is yours. No styles, no theme to
          override, no <code>NgModule</code>.
        </p>
        <div class="cta">
          <a class="btn btn--primary" [routerLink]="['/getting-started']">Get started</a>
          <a class="btn" [routerLink]="['/', firstPrimitive]">Browse primitives</a>
        </div>
        <p class="install"><code>npm install forty-cdk</code></p>
      </div>

      <div class="hero-demo">
        <div class="demo-card">
          <span class="demo-label">Live · <code>forty-cdk/switch</code></span>
          <div class="demo-row">
            <button forSwitch class="switch" [(checked)]="enabled" aria-label="Notifications">
              <span class="switch__thumb"></span>
            </button>
            <span class="demo-state">
              data-state="<strong>{{ enabled() ? 'checked' : 'unchecked' }}</strong
              >"
            </span>
          </div>
          <p class="demo-note">
            One directive on your own <code>&lt;button&gt;</code>. It carries
            <code>role="switch"</code>, keeps <code>aria-checked</code> in step, toggles on
            <kbd>Space</kbd> and <kbd>Enter</kbd>, and reflects its state for your CSS. The
            appearance above is thirty lines of ordinary CSS.
          </p>
        </div>
      </div>
    </section>

    <section class="traits" aria-labelledby="why">
      <h2 id="why">Why forty-cdk</h2>
      <ul class="trait-grid">
        @for (trait of traits; track trait.title) {
          <li class="trait">
            <h3>{{ trait.title }}</h3>
            <p>{{ trait.body }}</p>
          </li>
        }
      </ul>
    </section>

    <section class="next" aria-labelledby="next-heading">
      <h2 id="next-heading">Where to go next</h2>
      <ul class="next-grid">
        <li>
          <a class="card" [routerLink]="['/installation']">
            <span class="card-title">Installation</span>
            <span class="card-desc">
              Peer dependencies, supported Angular versions, and the import model.
            </span>
          </a>
        </li>
        <li>
          <a class="card" [routerLink]="['/getting-started']">
            <span class="card-title">Getting started</span>
            <span class="card-desc">
              One primitive from install to styled and bound to a form.
            </span>
          </a>
        </li>
        <li>
          <a class="card" [routerLink]="['/concepts']">
            <span class="card-title">Concepts</span>
            <span class="card-desc">
              The composition model, the <code>data-*</code> vocabulary, entry points.
            </span>
          </a>
        </li>
        <li>
          <a class="card" [routerLink]="['/guides']">
            <span class="card-title">Guides</span>
            <span class="card-desc">
              Styling, overlays, design-system wrappers and the table compositions.
            </span>
          </a>
        </li>
      </ul>
      <p class="repo">
        {{ primitiveCount }} primitives, each its own entry point ·
        <a [href]="repo" target="_blank" rel="noreferrer noopener">Source on GitHub</a>
      </p>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 1180px;
      margin: 0 auto;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: center;
      gap: 3rem;
      padding: 1rem 0 3.5rem;
    }

    .hero h1 {
      margin: 0;
      font-size: 2.4rem;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .lede {
      margin: 1rem 0 0;
      max-width: 55ch;
      font-size: 1.05rem;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      height: 42px;
      padding: 0 1.25rem;
      font-weight: 700;
      text-decoration: none;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
    }

    .btn:hover {
      background: var(--pg-surface-2);
    }

    .btn--primary {
      color: var(--pg-primary-contrast);
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .btn--primary:hover {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .install {
      margin: 1.25rem 0 0;
      font-size: 0.9rem;
      color: var(--pg-text-muted);
    }

    .demo-card {
      padding: 1.5rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      box-shadow: var(--pg-shadow);
    }

    .demo-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .demo-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1.25rem 0;
    }

    .switch {
      flex: none;
      width: 52px;
      height: 30px;
      padding: 3px;
      border: none;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: pointer;
      transition: background 150ms;
    }

    .switch__thumb {
      display: block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #fff;
      transition: transform 150ms var(--pg-ease-spring);
    }

    .switch[data-state='checked'] {
      background: var(--pg-primary);
    }

    .switch[data-state='checked'] .switch__thumb {
      transform: translateX(22px);
    }

    .demo-state {
      font-family: var(--pg-font-mono);
      font-size: 0.8rem;
      color: var(--pg-text-muted);
    }

    .demo-note {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .traits h2,
    .next h2 {
      margin: 0 0 1.25rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .trait-grid,
    .next-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .trait {
      padding: 1.1rem 1.25rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .trait h3 {
      margin: 0 0 0.4rem;
      font-size: 0.95rem;
    }

    .trait p {
      margin: 0;
      font-size: 0.87rem;
      line-height: 1.55;
      color: var(--pg-text-muted);
    }

    .next {
      margin-top: 3rem;
      padding-bottom: 1rem;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      height: 100%;
      padding: 0.9rem 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      text-decoration: none;
    }

    .card:hover {
      border-color: var(--pg-border-strong);
      background: var(--pg-surface-2);
    }

    .card-title {
      font-weight: 700;
      color: var(--pg-text);
    }

    .card-desc {
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }

    .repo {
      margin: 1.5rem 0 0;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }

    code {
      font-family: var(--pg-font-mono);
      font-size: 0.9em;
      padding: 0.05em 0.35em;
      border-radius: 6px;
      background: var(--pg-code-inline-bg);
      color: var(--pg-code-inline-fg);
    }

    kbd {
      font-family: var(--pg-font-mono);
      font-size: 0.8em;
      padding: 0.1em 0.4em;
      border-radius: 6px;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border-strong);
    }

    @media (max-width: 980px) {
      .hero {
        grid-template-columns: minmax(0, 1fr);
        gap: 2rem;
        padding-bottom: 2.5rem;
      }

      .hero h1 {
        font-size: 1.9rem;
      }
    }
  `,
})
export class HomePage {
  protected readonly repo = GITHUB_REPO;
  protected readonly enabled = signal(true);

  protected readonly primitiveCount = PLAYGROUND_GROUPS.reduce(
    (total, group) => total + group.primitives.length,
    0,
  );

  protected readonly firstPrimitive = PLAYGROUND_GROUPS[0]?.primitives[0]?.slug ?? 'accordion';

  protected readonly traits: readonly Trait[] = [
    {
      title: 'Accessibility is the API',
      body: 'Every primitive names the WAI-ARIA APG pattern it implements: roles, live ARIA, the full keyboard map, focus management and RTL.',
    },
    {
      title: 'Styleless by design',
      body: 'No CSS ships. You style your own class against the data-* state each piece reflects and the --for-* properties it measures.',
    },
    {
      title: 'Signals, not ceremony',
      body: 'input() / output() / model(), inject(), standalone directives. State is a signal you read, not an observable you unsubscribe from.',
    },
    {
      title: 'Zoneless and SSR-safe',
      body: 'Works under provideZonelessChangeDetection(); Zone.js is never required. Every primitive carries a server-render smoke test.',
    },
    {
      title: 'One entry point each',
      body: 'Import forty-cdk/dialog and your bundle never sees Table. The isolation is structural, not a tree-shaking result.',
    },
    {
      title: 'Composed, not configured',
      body: 'A primitive is a set of directives you arrange in your own markup. They find each other through DI, so you can wrap any of them.',
    },
  ];
}
