import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForSelect } from './select';
import { ForSelectContent } from './select-content';
import { ForSelectGroup } from './select-group';
import { ForSelectGroupLabel } from './select-group-label';
import { ForSelectOption } from './select-option';
import { ForSelectTrigger } from './select-trigger';

@Component({
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open" [modal]="modal()">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent data-test-id="content">
          <div forSelectGroup>
            <div forSelectGroupLabel data-test-id="group-label">Fruit</div>
            <div forSelectOption value="apple" data-test-id="apple">Apple</div>
            <div forSelectOption value="banana" data-test-id="banana">Banana</div>
          </div>
          <button type="button" data-test-id="consumer">Help</button>
        </div>
      }
    </div>
  `,
})
class Host {
  readonly open = signal(false);
  readonly modal = signal(false);
}

function byTestId(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-test-id="${id}"]`);
  expect(found, id).not.toBeNull();
  return found!;
}

describe('select surface press', () => {
  afterEachOverlayCleanup();

  for (const modal of [false, true]) {
    describe(modal ? 'modal' : 'non-modal', () => {
      async function setup() {
        const rendered = renderHost(Host);
        rendered.instance.modal.set(modal);
        rendered.instance.open.set(true);
        await flush(rendered.fixture);
        byTestId('apple').focus();
        await flush(rendered.fixture);
        return rendered;
      }

      for (const target of ['content', 'group-label']) {
        it(`keeps focus on the option when ${target} is pressed`, async () => {
          const { fixture } = await setup();

          pressWithMouse(byTestId(target));
          await flush(fixture);

          expect(document.activeElement).toBe(byTestId('apple'));
          expect(fixture.componentInstance.open()).toBe(true);
        });
      }

      it('keeps the arrow keys working after a press on the padding', async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId('content'));
        await flush(fixture);
        pressKey(document.activeElement!, 'ArrowDown');
        await flush(fixture);

        expect(document.activeElement).toBe(byTestId('banana'));
      });

      it('lets a press on an option or a consumer control through', async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId('consumer'));
        await flush(fixture);
        expect(document.activeElement).toBe(byTestId('consumer'));

        const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        expect(byTestId('banana').dispatchEvent(press)).toBe(true);
      });
    });
  }
});
