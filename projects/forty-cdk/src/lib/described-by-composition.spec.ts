import { Component, signal, type Type } from '@angular/core';

import { afterEachOverlayCleanup, renderHost } from '../test-utils';

import { ForField, ForFieldDescription, ForFieldError } from 'forty-cdk/field';
import { ForInput } from 'forty-cdk/input';
import { ForSwitch } from 'forty-cdk/switch';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

abstract class DescribedHost {
  readonly invalid = signal(false);
}

@Component({
  imports: [
    ForField,
    ForFieldDescription,
    ForFieldError,
    ForSwitch,
    ForTooltip,
    ForTooltipContent,
    ForTooltipTrigger,
  ],
  template: `
    <div forField>
      <span forTooltip #tip="forTooltip" [openDelay]="0" [closeDelay]="0">
        <button
          forSwitch
          forTooltipTrigger
          aria-describedby="consumer-hint"
          [invalid]="invalid()"
          data-test-id="control"
        ></button>
        @if (tip.open()) {
          <div forTooltipContent data-test-id="tip">Tip</div>
        }
      </span>
      <p forFieldDescription data-test-id="description">Hint</p>
      <p forFieldError data-test-id="error">Invalid.</p>
    </div>
  `,
})
class SwitchHost extends DescribedHost {}

@Component({
  imports: [
    ForField,
    ForFieldDescription,
    ForFieldError,
    ForInput,
    ForTooltip,
    ForTooltipContent,
    ForTooltipTrigger,
  ],
  template: `
    <div forField>
      <span forTooltip #tip="forTooltip" [openDelay]="0" [closeDelay]="0">
        <input
          forInput
          forTooltipTrigger
          aria-describedby="consumer-hint"
          [invalid]="invalid()"
          data-test-id="control"
        />
        @if (tip.open()) {
          <div forTooltipContent data-test-id="tip">Tip</div>
        }
      </span>
      <p forFieldDescription data-test-id="description">Hint</p>
      <p forFieldError data-test-id="error">Invalid.</p>
    </div>
  `,
})
class InputHost extends DescribedHost {}

const HOSTS: ReadonlyArray<readonly [string, Type<DescribedHost>]> = [
  ['switch', SwitchHost],
  ['input', InputHost],
];

function q(root: HTMLElement, id: string): HTMLElement {
  return root.ownerDocument.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
}

function describedIds(el: HTMLElement): string[] {
  return (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
}

describe('aria-describedby composition on a field control that is also a tooltip trigger', () => {
  afterEachOverlayCleanup();

  for (const [name, host] of HOSTS) {
    describe(name, () => {
      it('carries the consumer and field description ids on first render', async () => {
        const { el, flush } = renderHost(host);
        await flush();

        expect(describedIds(q(el, 'control'))).toEqual(['consumer-hint', q(el, 'description').id]);
      });

      it('keeps the description id while the tooltip is open and after it closes', async () => {
        const { el, flush } = renderHost(host);
        await flush();
        const control = q(el, 'control');
        const description = q(el, 'description').id;

        control.dispatchEvent(new FocusEvent('focus'));
        await flush();
        expect(describedIds(control)).toEqual(['consumer-hint', q(el, 'tip').id, description]);

        control.dispatchEvent(new FocusEvent('blur'));
        await flush();
        expect(q(el, 'tip')).toBeNull();
        expect(describedIds(control)).toEqual(['consumer-hint', description]);
      });

      it('keeps the error id of an invalid field across an open-close cycle', async () => {
        const { el, fixture, flush } = renderHost(host);
        fixture.componentInstance.invalid.set(true);
        await flush();
        const control = q(el, 'control');
        const description = q(el, 'description').id;
        const error = q(el, 'error').id;
        expect(describedIds(control)).toEqual(['consumer-hint', description, error]);

        control.dispatchEvent(new FocusEvent('focus'));
        await flush();
        expect(describedIds(control)).toEqual([
          'consumer-hint',
          q(el, 'tip').id,
          description,
          error,
        ]);

        control.dispatchEvent(new FocusEvent('blur'));
        await flush();
        expect(describedIds(control)).toEqual(['consumer-hint', description, error]);
      });

      it('drops the error id when the field turns valid again', async () => {
        const { el, fixture, flush } = renderHost(host);
        fixture.componentInstance.invalid.set(true);
        await flush();
        const control = q(el, 'control');

        fixture.componentInstance.invalid.set(false);
        await flush();
        expect(describedIds(control)).toEqual(['consumer-hint', q(el, 'description').id]);
      });
    });
  }
});
