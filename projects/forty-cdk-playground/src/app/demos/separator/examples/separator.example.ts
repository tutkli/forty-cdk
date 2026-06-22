import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk/separator';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-separator-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForSeparator],
  template: `
    <playground-demo
      title="Dividers"
      subtitle="A static divider between groups of content or controls. Horizontal by default; set orientation='vertical' for an inline divider. Mark it decorative to drop the separator role when it carries no structural meaning."
      sourcePath="projects/forty-cdk-playground/src/app/demos/separator/examples/separator.example.ts"
    >
      <div demo class="sep-demo">
        <div class="sep-card">
          <span class="sep-label">Account</span>
          <hr forSeparator class="sep-h" />
          <span class="sep-label">Workspace</span>
          <hr forSeparator class="sep-h" />
          <div class="sep-inline">
            <span>Edit</span>
            <span forSeparator decorative orientation="vertical" class="sep-v"></span>
            <span>Share</span>
            <span forSeparator decorative orientation="vertical" class="sep-v"></span>
            <span>Delete</span>
          </div>
        </div>
      </div>
    </playground-demo>
  `,
  styles: `
    .sep-demo {
      width: min(560px, 100%);
    }

    .sep-card {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .sep-label {
      font-weight: 600;
    }

    .sep-h {
      width: 100%;
      height: 1px;
      margin: 0;
      border: 0;
      background: var(--pg-border);
    }

    .sep-inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--pg-text-muted);
    }

    .sep-v {
      width: 1px;
      height: 16px;
      background: var(--pg-border-strong);
    }
  `,
})
export class SeparatorExample {}
