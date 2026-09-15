import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk/separator';

@Component({
  selector: 'app-separator-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSeparator],
  template: `
    <div class="card">
      <span class="label">Account</span>
      <hr forSeparator class="separator-h" />
      <span class="label">Workspace</span>
      <hr forSeparator class="separator-h" />
      <div class="inline">
        <span>Edit</span>
        <span forSeparator decorative orientation="vertical" class="separator-v"></span>
        <span>Share</span>
        <span forSeparator decorative orientation="vertical" class="separator-v"></span>
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

    .separator-h {
      width: 100%;
      height: 1px;
      margin: 0;
      border: 0;
      background: var(--ex-border, #e5e0d6);
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--ex-muted, #585d66);
    }

    .separator-v {
      width: 1px;
      height: 16px;
      background: var(--ex-border-strong, #d0c9bc);
    }
  `,
})
export class SeparatorDefaultExample {}
