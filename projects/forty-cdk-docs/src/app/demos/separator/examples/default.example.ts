import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk/separator';

@Component({
  selector: 'app-separator-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSeparator],
  template: `
    <div class="card">
      <span class="label">Account</span>
      <hr forSeparator class="separator" />
      <span class="label">Workspace</span>
      <hr forSeparator class="separator" />
      <div class="inline">
        <span>Edit</span>
        <span forSeparator decorative orientation="vertical" class="separator"></span>
        <span>Share</span>
        <span forSeparator decorative orientation="vertical" class="separator"></span>
        <span>Delete</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .card {
      width: min(560px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      padding: 1rem 1.1rem;
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
    }

    .label {
      font-weight: 600;
    }

    .separator {
      margin: 0;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .separator[data-orientation='horizontal'] {
      inline-size: 100%;
      block-size: 1px;
    }

    .separator[data-orientation='vertical'] {
      inline-size: 1px;
      block-size: 16px;
      background: var(--ex-border-strong, #d0c9bc);
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--ex-muted, #585d66);
    }
  `,
})
export class SeparatorDefaultExample {}
