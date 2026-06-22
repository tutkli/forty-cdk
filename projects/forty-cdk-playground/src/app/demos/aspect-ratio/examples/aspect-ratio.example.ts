import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForAspectRatio } from 'forty-cdk/aspect-ratio';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-aspect-ratio-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForAspectRatio, ControlSelect],
  template: `
    <playground-demo
      title="Locked ratio box"
      subtitle="A layout utility that locks a box to a width / height ratio. It only sets the CSS aspect-ratio property on its host — no ARIA, no behavior. The content scales fluidly with the available width."
      sourcePath="projects/forty-cdk-playground/src/app/demos/aspect-ratio/examples/aspect-ratio.example.ts"
    >
      <div demo class="ar-demo">
        <div forAspectRatio class="ar-box" [ratio]="ratio()">
          <span class="ar-label">{{ currentLabel() }}</span>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="ratio" [options]="ratioOptions" [(value)]="ratioValue" />

        <p class="pg-state">
          ratio: <b>{{ ratio().toFixed(3) }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .ar-demo {
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .ar-box {
      width: min(340px, 100%);
      display: grid;
      place-items: center;
      border-radius: var(--pg-radius);
      overflow: hidden;
      color: #fff;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, var(--pg-primary), #ec4899);
    }

    .ar-label {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.25);
    }
  `,
})
export class AspectRatioExample {
  protected readonly ratioOptions: readonly ControlOption[] = [
    { value: '16/9', label: '16 / 9' },
    { value: '4/3', label: '4 / 3' },
    { value: '1/1', label: '1 / 1 (square)' },
    { value: '21/9', label: '21 / 9' },
    { value: '3/4', label: '3 / 4 (portrait)' },
  ];

  protected readonly ratioValue = signal('16/9');

  protected readonly ratio = computed<number>(() => {
    switch (this.ratioValue()) {
      case '4/3':
        return 4 / 3;
      case '1/1':
        return 1;
      case '21/9':
        return 21 / 9;
      case '3/4':
        return 3 / 4;
      default:
        return 16 / 9;
    }
  });

  protected readonly currentLabel = computed<string>(
    () => this.ratioOptions.find((option) => option.value === this.ratioValue())?.label ?? '',
  );
}
