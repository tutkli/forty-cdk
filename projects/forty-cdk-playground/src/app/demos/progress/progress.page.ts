import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { ProgressExample } from './examples/progress.example';

@Component({
  selector: 'app-progress-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, ProgressExample],
  template: `
    <primitive-page slug="progress">
      <app-progress-example />
    </primitive-page>
  `,
})
export class ProgressPage {}
