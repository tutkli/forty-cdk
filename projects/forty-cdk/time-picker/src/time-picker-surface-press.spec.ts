import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForTimePicker } from './time-picker';
import { ForTimePickerContent } from './time-picker-content';
import { ForTimePickerOption } from './time-picker-option';
import { ForTimePickerTrigger } from './time-picker-trigger';

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTimePicker [(open)]="open" [modal]="modal()">
      <button forTimePickerTrigger>Time</button>
      @if (open()) {
        <div forTimePickerContent data-test-id="content">
          <div data-test-id="heading">Morning</div>
          <div forTimePickerOption [value]="nine" data-test-id="nine">09:00</div>
          <div forTimePickerOption [value]="ten" data-test-id="ten">10:00</div>
          <button type="button" data-test-id="consumer">Now</button>
        </div>
      }
    </div>
  `,
})
class Host {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly nine = new Date(2000, 0, 1, 9, 0, 0);
  readonly ten = new Date(2000, 0, 1, 10, 0, 0);
}

function byTestId(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-test-id="${id}"]`);
  expect(found, id).not.toBeNull();
  return found!;
}

describe('time picker surface press', () => {
  afterEachOverlayCleanup();

  for (const modal of [false, true]) {
    describe(modal ? 'modal' : 'non-modal', () => {
      async function setup() {
        const rendered = renderHost(Host);
        rendered.instance.modal.set(modal);
        rendered.instance.open.set(true);
        await flush(rendered.fixture);
        byTestId('nine').focus();
        await flush(rendered.fixture);
        return rendered;
      }

      for (const target of ['content', 'heading']) {
        it(`keeps focus on the slot when ${target} is pressed`, async () => {
          const { fixture } = await setup();

          pressWithMouse(byTestId(target));
          await flush(fixture);

          expect(document.activeElement).toBe(byTestId('nine'));
          expect(fixture.componentInstance.open()).toBe(true);
        });
      }

      it('keeps the arrow keys working after a press on the padding', async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId('content'));
        await flush(fixture);
        pressKey(document.activeElement!, 'ArrowDown');
        await flush(fixture);

        expect(document.activeElement).toBe(byTestId('ten'));
      });

      it('lets a press on a slot or a consumer control through', async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId('consumer'));
        await flush(fixture);
        expect(document.activeElement).toBe(byTestId('consumer'));

        const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        expect(byTestId('ten').dispatchEvent(press)).toBe(true);
      });
    });
  }
});
