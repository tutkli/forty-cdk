import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ForDragHandle, ForFreeDrag } from 'forty-cdk/drag-drop';

@Component({
  selector: 'app-free-drag-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFreeDrag, ForDragHandle],
  styles: [
    `
      .viewport {
        position: relative;
        width: 400px;
        height: 300px;
        margin: 40px;
        border: 1px solid #ccc;
        background: #fafafa;
      }
      .box {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        background: #4f46e5;
        color: #fff;
        cursor: grab;
        touch-action: none;
      }
      .box[data-dragging] {
        cursor: grabbing;
      }
      .dialog {
        position: absolute;
        top: 40px;
        left: 200px;
        width: 160px;
        height: 110px;
        background: #fff;
        border: 1px solid #333;
        box-sizing: border-box;
      }
      .dialog header {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        background: #eee;
        cursor: grab;
      }
    `,
  ],
  template: `
    <div class="viewport" data-testid="viewport">
      <div class="box" forFreeDrag boundary=".viewport" data-testid="box"></div>

      <div class="dialog" data-testid="dialog">
        <header forFreeDrag rootElement=".dialog" boundary=".viewport" data-testid="dialog-header">
          <span forDragHandle aria-hidden="true" data-testid="dialog-handle">⠿</span>
          Title
        </header>
        Body
      </div>
    </div>
  `,
})
export class FreeDragFixture {}
