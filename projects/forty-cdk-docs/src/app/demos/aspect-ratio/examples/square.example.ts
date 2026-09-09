import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForAspectRatio } from 'forty-cdk/aspect-ratio';

@Component({
  selector: 'app-aspect-ratio-square-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAspectRatio],
  template: `
    <div forAspectRatio class="box" [ratio]="1">
      <span class="label">1 / 1</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .box {
      width: min(240px, 100%);
      display: grid;
      place-items: center;
      border-radius: var(--pg-radius);
      overflow: hidden;
      color: #fff;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, #0ea5e9, #22c55e);
    }

    .label {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.25);
    }
  `,
})
export class AspectRatioSquareExample {}
