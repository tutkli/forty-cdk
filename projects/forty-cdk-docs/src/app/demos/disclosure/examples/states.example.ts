import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';

@Component({
  selector: 'app-disclosure-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <div forDisclosure class="dis" [(open)]="open">
          <button type="button" forDisclosureTrigger class="dis-trigger">
            <span>What is inside the box?</span>
            <span class="chevron" aria-hidden="true"></span>
          </button>
          <div forDisclosureContent class="dis-content">
            <div class="dis-inner">
              <p>Behavior, ARIA and focus are handled for you; the styling is entirely yours.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <div forDisclosure class="dis" [(open)]="open" disabled>
          <button type="button" forDisclosureTrigger class="dis-trigger">
            <span>This section is locked</span>
            <span class="chevron" aria-hidden="true"></span>
          </button>
          <div forDisclosureContent class="dis-content">
            <div class="dis-inner">
              <p>The trigger leaves the tab order and ignores clicks and keys.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
      width: min(440px, 100%);
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ex-muted, #585d66);
    }

    .dis {
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      overflow: hidden;
    }

    .dis[data-disabled] {
      opacity: 0.5;
    }

    .dis-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      font: inherit;
      font-weight: 600;
      text-align: left;
      color: var(--ex-text, #17191c);
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .dis-trigger:hover:not([data-disabled]) {
      background: var(--ex-surface-2, #f2eee6);
    }

    .dis-trigger[data-disabled] {
      cursor: not-allowed;
    }

    .chevron {
      flex: none;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--ex-muted, #585d66);
      border-bottom: 2px solid var(--ex-muted, #585d66);
      transform: rotate(45deg);
      transition: transform 0.2s ease;
    }

    .dis-trigger[data-state='open'] .chevron {
      transform: rotate(-135deg);
    }

    .dis-content {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.25s ease;
    }

    .dis-content[data-state='open'] {
      grid-template-rows: 1fr;
    }

    .dis-inner {
      overflow: hidden;
    }

    .dis-inner p {
      margin: 0;
      padding: 0 1rem 0.95rem;
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .dis-content,
      .chevron {
        transition: none;
      }
    }
  `,
})
export class DisclosureStatesExample {
  protected readonly open = signal(true);
}
