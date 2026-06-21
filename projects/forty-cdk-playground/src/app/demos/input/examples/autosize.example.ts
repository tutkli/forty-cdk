import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTextarea } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-input-autosize-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch, ForTextarea],
  template: `
    <playground-demo
      title="Auto-sizing textarea"
      subtitle="Add autosize to forTextarea and the host tracks its content height — growing as you type more lines and shrinking back as you delete them, recomputed on every edit and on width reflow. It reflects data-autosize; pair it with resize: none; overflow: hidden. The measurement is browser-only, so it stays inert under SSR."
      sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/autosize.example.ts"
    >
      <div demo class="stack">
        <textarea
          forTextarea
          class="pg-input area"
          [class.area--autosize]="autosize()"
          rows="2"
          aria-label="Release notes"
          placeholder="Type a few lines…"
          [autosize]="autosize()"
          [(value)]="text"
        ></textarea>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="autosize" [(checked)]="autosize" />
        <p class="pg-state">
          lines: <b>{{ lineCount() }}</b
          ><br />
          chars: <b>{{ text().length }}</b>
        </p>
        <p class="pg-hint">
          With autosize off, the box keeps its CSS height and you scroll. Turn it on and the field
          resizes to fit every line.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stack {
      width: min(360px, 100%);
    }

    .area {
      width: 100%;
      resize: vertical;
      min-height: 3.5rem;
    }

    .area--autosize {
      resize: none;
      overflow: hidden;
    }
  `,
})
export class InputAutosizeExample {
  protected readonly autosize = signal(true);
  protected readonly text = signal(
    'forty-cdk 0.1.0\n— Breadcrumbs, Search, Pagination\n— File Upload, Button',
  );

  protected lineCount(): number {
    return this.text().split('\n').length;
  }
}
