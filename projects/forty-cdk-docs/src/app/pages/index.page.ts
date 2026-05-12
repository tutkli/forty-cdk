import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <p class="hero__eyebrow">Headless UI for Angular 21+</p>
      <h1 class="hero__title">Composable. Accessible. Signal-first.</h1>
      <p class="hero__lede">
        29 WAI-ARIA primitives shipped as headless directives. State, behavior, focus
        management, and keyboard interaction baked in — styling stays yours.
      </p>
      <div class="hero__cta">
        <a routerLink="/docs/getting-started" class="hero__cta-primary">Get started →</a>
        <a routerLink="/components" class="hero__cta-secondary">Browse components</a>
      </div>
    </section>

    <section class="why">
      <h2 class="why__title">Why forty-cdk</h2>
      <div class="why__grid">
        <article>
          <h3>Headless, not styleless on principle</h3>
          <p>
            Every primitive ships zero CSS. You bring the tokens; the directive handles ARIA,
            focus trap, return-focus, roving tabindex, Escape stack, RTL, reduced motion.
          </p>
        </article>
        <article>
          <h3>Modern Angular only</h3>
          <p>
            Standalone, zoneless, signals, <code>host: &#123;&#125;</code>, attribute selectors. No
            <code>NgModule</code>, no decorators-as-state, no Zone.js. Angular 21+ idioms, end to end.
          </p>
        </article>
        <article>
          <h3>Composable by design</h3>
          <p>
            One folder per primitive, pieces wired via <code>InjectionToken</code>. Tree-shakable
            from a single entry point — only what you import ships in your bundle.
          </p>
        </article>
        <article>
          <h3>Tested where it counts</h3>
          <p>
            Real-browser Playwright covers focus, keyboard, geometry, pointer capture, mobile
            gestures. Vitest covers ARIA + signals. Zero flake budget.
          </p>
        </article>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .hero {
      padding: 3rem 0 4rem;
      text-align: center;
    }
    .hero__eyebrow {
      margin: 0;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--for-on-surface-muted);
    }
    .hero__title {
      margin: 0.75rem 0 1rem;
      font-size: clamp(2.25rem, 5vw, 3.5rem);
      letter-spacing: -0.025em;
      font-weight: 700;
      line-height: 1.1;
      color: var(--for-on-surface);
    }
    .hero__lede {
      margin: 0 auto;
      max-width: 56ch;
      font-size: 1.1rem;
      color: var(--for-on-surface-muted);
    }
    .hero__cta {
      margin-top: 2rem;
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .hero__cta a {
      padding: 0.6rem 1.1rem;
      border-radius: var(--for-radius-md);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .hero__cta-primary {
      background: var(--for-accent);
      color: var(--for-surface);
    }
    .hero__cta-primary:hover {
      filter: brightness(1.08);
    }
    .hero__cta-secondary {
      background: var(--for-surface-elevated);
      color: var(--for-on-surface);
      border: 1px solid var(--for-border);
    }
    .hero__cta-secondary:hover {
      border-color: var(--for-border-strong);
    }
    .why {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid var(--for-border);
    }
    .why__title {
      margin: 0 0 1.5rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--for-on-surface-muted);
      text-align: center;
    }
    .why__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
      gap: 1.25rem;
    }
    .why__grid article {
      padding: 1.25rem 1.4rem;
      background: var(--for-surface-elevated);
      border: 1px solid var(--for-border);
      border-radius: var(--for-radius-md);
    }
    .why__grid h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      letter-spacing: -0.01em;
    }
    .why__grid p {
      margin: 0;
      color: var(--for-on-surface-muted);
      font-size: 0.92rem;
      line-height: 1.55;
    }
    .why__grid code {
      background: var(--for-surface-muted);
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      font-size: 0.88em;
    }
  `,
})
export default class HomePage {}
