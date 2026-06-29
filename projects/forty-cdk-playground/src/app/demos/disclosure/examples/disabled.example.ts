import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';

@Component({
  selector: 'app-disclosure-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure class="dis" [(open)]="open" disabled>
      <button type="button" forDisclosureTrigger class="dis-trigger">
        <span>This section is locked</span>
        <span class="chevron" aria-hidden="true"></span>
      </button>
      <div forDisclosureContent class="dis-content">
        <div class="dis-inner">
          <p>
            While disabled the trigger leaves the tab order and ignores clicks and keys, so the
            panel cannot be toggled.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .dis {
      width: min(440px, 100%);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
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
      color: var(--pg-text);
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .dis-trigger:hover {
      background: var(--pg-surface-2);
    }

    .dis-trigger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chevron {
      flex: none;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--pg-text-muted);
      border-bottom: 2px solid var(--pg-text-muted);
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
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .dis-content,
      .chevron {
        transition: none;
      }
    }
  `,
})
export class DisclosureDisabledExample {
  protected readonly open = signal(false);
}
