import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="px-0 pb-16 pt-12 text-center">
      <p
        class="
          m-0 text-[0.85rem] uppercase tracking-[0.04em] text-on-surface-muted
        "
      >
        Headless UI for Angular 21+
      </p>
      <h1
        class="
          mb-4 mt-3 text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.1]
          tracking-[-0.025em] text-on-surface
        "
      >
        Composable. Accessible. Signal-first.
      </h1>
      <p class="mx-auto max-w-[56ch] text-[1.1rem] text-on-surface-muted">
        29 WAI-ARIA primitives shipped as headless directives. State, behavior, focus management,
        and keyboard interaction baked in — styling stays yours.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a
          routerLink="/docs/getting-started"
          class="
            rounded-md bg-accent px-4 py-2.5 text-[0.95rem] font-semibold
            text-surface no-underline transition-[filter] duration-100
            hover:brightness-110
          "
        >
          Get started →
        </a>
        <a
          routerLink="/components"
          class="
            rounded-md border border-border-soft bg-surface-elevated px-4 py-2.5
            text-[0.95rem] font-semibold text-on-surface no-underline
            transition-colors duration-100 hover:border-border-strong
          "
        >
          Browse components
        </a>
      </div>
    </section>

    <section class="mt-8 border-t border-border-soft pt-8">
      <h2
        class="
          mb-6 text-center text-[0.85rem] uppercase tracking-[0.08em]
          text-on-surface-muted
        "
      >
        Why forty-cdk
      </h2>
      <div
        class="
          grid gap-5
          grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]
        "
      >
        <article
          class="
            rounded-md border border-border-soft bg-surface-elevated
            px-5 py-5
          "
        >
          <h3 class="mb-2 mt-0 text-base tracking-[-0.01em]">
            Headless, not styleless on principle
          </h3>
          <p class="m-0 text-[0.92rem] leading-[1.55] text-on-surface-muted">
            Every primitive ships zero CSS. You bring the tokens; the directive handles ARIA, focus
            trap, return-focus, roving tabindex, Escape stack, RTL, reduced motion.
          </p>
        </article>
        <article
          class="
            rounded-md border border-border-soft bg-surface-elevated
            px-5 py-5
          "
        >
          <h3 class="mb-2 mt-0 text-base tracking-[-0.01em]">Modern Angular only</h3>
          <p
            class="
              m-0 text-[0.92rem] leading-[1.55] text-on-surface-muted
              [&_code]:rounded-[3px] [&_code]:bg-surface-muted [&_code]:px-1.5
              [&_code]:py-0.5 [&_code]:text-[0.88em]
            "
          >
            Standalone, zoneless, signals, <code>host: &#123;&#125;</code>, attribute selectors. No
            <code>NgModule</code>, no decorators-as-state, no Zone.js. Angular 21+ idioms, end to
            end.
          </p>
        </article>
        <article
          class="
            rounded-md border border-border-soft bg-surface-elevated
            px-5 py-5
          "
        >
          <h3 class="mb-2 mt-0 text-base tracking-[-0.01em]">Composable by design</h3>
          <p
            class="
              m-0 text-[0.92rem] leading-[1.55] text-on-surface-muted
              [&_code]:rounded-[3px] [&_code]:bg-surface-muted [&_code]:px-1.5
              [&_code]:py-0.5 [&_code]:text-[0.88em]
            "
          >
            One folder per primitive, pieces wired via <code>InjectionToken</code>. Tree-shakable
            from a single entry point — only what you import ships in your bundle.
          </p>
        </article>
        <article
          class="
            rounded-md border border-border-soft bg-surface-elevated
            px-5 py-5
          "
        >
          <h3 class="mb-2 mt-0 text-base tracking-[-0.01em]">Tested where it counts</h3>
          <p class="m-0 text-[0.92rem] leading-[1.55] text-on-surface-muted">
            Real-browser Playwright covers focus, keyboard, geometry, pointer capture, mobile
            gestures. Vitest covers ARIA + signals. Zero flake budget.
          </p>
        </article>
      </div>
    </section>
  `,
})
export default class HomePage {}
