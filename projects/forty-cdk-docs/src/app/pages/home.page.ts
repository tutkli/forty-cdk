import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { injectFragmentScroll } from '../doc/doc-fragment';
import { ENTRY_POINT_COUNT, LIBRARY } from '../primitives';
import { GITHUB_BLOB_BASE } from '../ui/github';
import { Icon } from '../ui/icon';
import { LandingFooter } from '../ui/landing-footer';
import { LandingHeader } from '../ui/landing-header';
import { LandingIndex } from '../ui/landing-index';
import { LandingSpecimen } from '../ui/landing-specimen';

const INSTALL_COMMAND = 'npm install forty-cdk';

@Component({
  selector: 'home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, LandingHeader, LandingFooter, LandingIndex, LandingSpecimen],
  template: `
    <landing-header />

    <main class="landing">
      <section class="hero">
        <div class="hero-text">
          <h1>Headless UI primitives for modern Angular<span class="dot">.</span></h1>
          <p class="lede">
            forty-cdk ships the part that is hard to get right — roles, keyboard interaction, focus
            management and state — and none of the part that is yours. No styles, no theme to
            override, no <code>NgModule</code>.
          </p>
          <p class="lede positioning">
            Not a component library: nothing here is painted, so there is nothing to theme — you
            build your own design system on top of behaviour that is already accessible.
          </p>
          <div class="cta">
            <a class="btn btn--primary" [routerLink]="['/getting-started']">Get started</a>
            <a class="btn" [routerLink]="[]" fragment="index-heading">
              Browse all {{ entryPointCount }}
            </a>
          </div>
          <div class="install">
            <span class="install-sigil">$</span>
            <code>{{ install }}</code>
            <button
              type="button"
              class="install-copy"
              (click)="copyInstall()"
              [attr.aria-label]="copyLabel()"
            >
              <app-icon [name]="copied() ? 'check' : 'clipboard'" />
            </button>
          </div>
          <p class="maturity">
            <span>v{{ library.version }}</span>
            <span aria-hidden="true">·</span>
            <span>Angular {{ library.angular }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ library.license }}</span>
            @if (preRelease) {
              <span aria-hidden="true">·</span>
              <a [href]="changelog" target="_blank" rel="noreferrer noopener">pre-1.0</a>
            }
          </p>
        </div>

        <landing-specimen />
      </section>

      <section class="why" aria-labelledby="why-heading">
        <h2 id="why-heading">Why forty-cdk</h2>
        <div class="why-grid">
          <div class="why-item">
            <h3>Styleless by design</h3>
            <p>
              No CSS ships. You style your own class against the <code>data-*</code> state each
              piece reflects and the <code>--for-*</code> properties it measures.
            </p>
          </div>
          <div class="why-item">
            <h3>Composed, not configured</h3>
            <p>
              A primitive is a set of directives you arrange in your own markup. They find each
              other through DI, so you can wrap any of them.
            </p>
          </div>
          <div class="why-item">
            <h3>Accessibility is the API</h3>
            <p>
              Every primitive names the WAI-ARIA APG pattern it implements: roles, live ARIA, the
              full keyboard map, focus management and RTL.
            </p>
          </div>
          <div class="why-item">
            <h3>Nothing to unsubscribe from</h3>
            <p>
              <code>input()</code>, <code>output()</code>, <code>model()</code>,
              <code>inject()</code>, standalone directives. State is a signal you read, not an
              observable you unsubscribe from.
            </p>
          </div>
          <div class="why-item">
            <h3>Zoneless and SSR-safe</h3>
            <p>
              Works under <code>provideZonelessChangeDetection()</code>; Zone.js is never required.
              Every primitive carries a server-render smoke test.
            </p>
          </div>
          <div class="why-item">
            <h3>Pay only for what you import</h3>
            <p>
              Import <code>forty-cdk/dialog</code> and your bundle never sees Table. Each primitive
              is its own entry point, so the isolation is structural, not a tree-shaking result.
            </p>
          </div>
        </div>
      </section>

      <section class="start" aria-labelledby="start-heading">
        <h2 id="start-heading">Start here</h2>
        <div class="start-rows">
          <a class="row" [routerLink]="['/installation']">
            <span class="row-title">Installation</span>
            <span class="row-desc">
              Peer dependencies, supported Angular versions, and the import model.
            </span>
            <app-icon name="chevron-right" />
          </a>
          <a class="row" [routerLink]="['/getting-started']">
            <span class="row-title">Getting started</span>
            <span class="row-desc">One primitive from install to styled and bound to a form.</span>
            <app-icon name="chevron-right" />
          </a>
          <a class="row" [routerLink]="['/concepts']">
            <span class="row-title">Concepts</span>
            <span class="row-desc">
              The composition model, the <code>data-*</code> vocabulary, entry points.
            </span>
            <app-icon name="chevron-right" />
          </a>
          <a class="row" [routerLink]="['/guides']">
            <span class="row-title">Guides</span>
            <span class="row-desc">
              Styling, overlays, design-system wrappers and the table compositions.
            </span>
            <app-icon name="chevron-right" />
          </a>
        </div>
      </section>

      <section aria-labelledby="index-heading">
        <landing-index />
      </section>
    </main>

    <landing-footer />
  `,
  styles: `
    :host {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
    }

    .landing {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      gap: 5rem;
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 4.5rem 2rem 5rem;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
      gap: 3rem;
      align-items: start;
    }

    .hero h1 {
      margin: 0;
      font-size: clamp(2.3rem, 4.6vw, 3.85rem);
      line-height: 1.03;
      letter-spacing: -0.035em;
      text-wrap: balance;
    }

    .dot {
      color: var(--pg-primary);
    }

    .lede {
      margin: 1.6rem 0 0;
      max-width: 47ch;
      font-size: 1.15rem;
      line-height: 1.55;
      color: var(--pg-text-muted);
    }

    .positioning {
      margin-top: 1rem;
      font-size: 1.02rem;
    }

    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 2rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      height: 50px;
      padding: 0 1.6rem;
      font-weight: 700;
      text-decoration: none;
      color: var(--pg-text);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius);
      corner-shape: squircle;
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
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      height: 46px;
      margin-top: 1.25rem;
      padding: 0 0.5rem 0 1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .install-sigil {
      font-family: var(--pg-font-mono);
      font-size: 0.85rem;
      color: var(--pg-secondary);
    }

    .install code {
      padding: 0;
      background: none;
      font-size: 0.88rem;
    }

    .install-copy {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: var(--pg-radius-xs);
      background: none;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .install-copy:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .install-copy app-icon {
      width: 16px;
      height: 16px;
    }

    .maturity {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.9rem 0 0;
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    .maturity a {
      color: var(--pg-secondary);
      text-decoration: none;
    }

    .maturity a:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    h2 {
      margin: 0;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
    }

    .why-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 2.5rem;
      margin-top: 0.5rem;
    }

    .why-item {
      padding: 1.6rem 0 1.75rem;
      border-top: 1px solid var(--pg-border);
    }

    .why-item h3 {
      margin: 0 0 0.5rem;
      font-size: 1.3rem;
      letter-spacing: -0.015em;
    }

    .why-item p {
      margin: 0;
      font-size: 0.97rem;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .start-rows {
      display: flex;
      flex-direction: column;
      margin-top: 1rem;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1.3rem 1.25rem 1.3rem 0;
      border-top: 1px solid var(--pg-border);
      color: var(--pg-text);
      text-decoration: none;
    }

    .row:last-child {
      border-bottom: 1px solid var(--pg-border);
    }

    .row:hover .row-title {
      color: var(--pg-primary);
    }

    .row:hover app-icon {
      color: var(--pg-text-muted);
    }

    .row-title {
      flex: none;
      width: 250px;
      font-family: var(--pg-font-display);
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }

    .row-desc {
      font-size: 0.97rem;
      color: var(--pg-text-muted);
    }

    .row app-icon {
      flex: none;
      width: 20px;
      height: 20px;
      margin-left: auto;
      color: var(--pg-border-strong);
    }

    code {
      font-family: var(--pg-font-mono);
      font-size: 0.86em;
      padding: 0.05em 0.35em;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-code-inline-bg);
      color: var(--pg-code-inline-fg);
    }

    @media (max-width: 1080px) {
      .hero {
        grid-template-columns: minmax(0, 1fr);
        gap: 2.5rem;
      }

      .why-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .landing {
        gap: 3.5rem;
        padding: 2.5rem 1rem 3.5rem;
      }

      .why-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 0;
      }

      .row {
        flex-wrap: wrap;
        gap: 0.35rem 1rem;
      }

      .row-title {
        width: auto;
      }

      .row-desc {
        flex: 1 0 100%;
      }
    }
  `,
})
export class HomePage {
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly copied = signal(false);

  protected readonly entryPointCount = ENTRY_POINT_COUNT;

  protected readonly install = INSTALL_COMMAND;
  protected readonly library = LIBRARY;
  protected readonly preRelease = LIBRARY.version.startsWith('0.');
  protected readonly changelog = `${GITHUB_BLOB_BASE}CHANGELOG.md`;

  protected readonly copyLabel = computed(() =>
    this.copied() ? 'Install command copied' : 'Copy the install command',
  );

  #resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    injectFragmentScroll();
    this.#destroyRef.onDestroy(() => {
      if (this.#resetTimer !== null) {
        clearTimeout(this.#resetTimer);
      }
    });
  }

  protected copyInstall(): void {
    const clipboard = this.#document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      return;
    }
    clipboard.writeText(INSTALL_COMMAND).then(
      () => {
        this.copied.set(true);
        if (this.#resetTimer !== null) {
          clearTimeout(this.#resetTimer);
        }
        this.#resetTimer = setTimeout(() => this.copied.set(false), 2000);
      },
      () => undefined,
    );
  }
}
