import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ProgressExample } from './examples/progress.example';
import { ProgressValueLabelExample } from './examples/value-label.example';

@Component({
  selector: 'app-progress-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ProgressExample, ProgressValueLabelExample],
  template: `
    <primitive-page slug="progress">
      <app-progress-example />
      <app-progress-value-label-example />
    </primitive-page>
  `,
})
export class ProgressPage {}
