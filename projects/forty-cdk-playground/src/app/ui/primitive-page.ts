import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { primitiveBySlug } from '../primitives';

@Component({
  selector: 'primitive-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div class="head-text">
        <h1>{{ meta().title }}</h1>
        <p>{{ meta().description }}</p>
      </div>
      @if (meta().apgUrl; as apgUrl) {
        <a class="apg" [href]="apgUrl" target="_blank" rel="noreferrer noopener">
          WAI-ARIA APG ↗
        </a>
      }
    </header>

    <div class="examples">
      <ng-content />
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
      margin-bottom: 2.5rem;
    }

    .head h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.5rem 0 0;
      max-width: 65ch;
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

    .examples {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    @media (max-width: 820px) {
      .head {
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.75rem;
      }

      .head h1 {
        font-size: 1.35rem;
      }

      .examples {
        gap: 2rem;
      }
    }
  `,
})
export class PrimitivePage {
  readonly slug = input.required<string>();

  protected readonly meta = computed(() => primitiveBySlug(this.slug()));
}
