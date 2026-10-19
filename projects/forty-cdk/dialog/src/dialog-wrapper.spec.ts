import { Component, Directive, signal, type Type, type WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';
import {
  FOR_FIELD_ANCHOR_CONTEXT,
  FOR_FIELD_CONTEXT,
  ForField,
  ForFieldControl,
  ForLabel,
} from 'forty-cdk/field';

import { ForDialog } from './dialog';
import { FOR_DIALOG_CONTEXT } from './dialog-context';

@Directive({
  selector: '[wrapperDialog]',
  exportAs: 'wrapperDialog',
  providers: [
    { provide: FOR_DIALOG_CONTEXT, useExisting: WrapperDialog },
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
})
class WrapperDialog extends ForDialog {}

@Directive({
  selector: '[halfWrappedDialog]',
  providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting: HalfWrappedDialog }],
})
class HalfWrappedDialog extends ForDialog {}

interface OuterFieldHost {
  readonly open: WritableSignal<boolean>;
}

@Component({
  imports: [ForField, ForLabel, ForFieldControl, WrapperDialog],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div wrapperDialog [ariaLabel]="'Details'" (dismiss)="open.set(false)">
          <input forFieldControl data-test-id="stray" />
        </div>
      }
    </div>
  `,
})
class WrapperHost implements OuterFieldHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForField, ForLabel, ForFieldControl, HalfWrappedDialog],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div halfWrappedDialog [ariaLabel]="'Details'" (dismiss)="open.set(false)">
          <input forFieldControl data-test-id="stray" />
        </div>
      }
    </div>
  `,
})
class HalfWrappedHost implements OuterFieldHost {
  readonly open = signal(false);
}

async function openInsideField(host: Type<OuterFieldHost>) {
  const r = renderHost(host);
  await r.flush();
  const field = r.fixture.debugElement.query(By.directive(ForField)).injector.get(ForField);
  const control = field.control();

  r.instance.open.set(true);
  await r.flush();

  return {
    field,
    control,
    stray: document.querySelector<HTMLElement>('[data-test-id="stray"]')!,
  };
}

describe('ForDialog subclass wrapper (#2321)', () => {
  afterEachOverlayCleanup();

  it('keeps a control inside the subclass out of the outer field', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { field, control, stray } = await openInsideField(WrapperHost);

    expect(field.control()).toBe(control);
    expect(stray.hasAttribute('aria-labelledby')).toBe(false);
    expect(warn.mock.calls.flat().join(' ')).not.toContain('FORCDK-FIELD-002');
  });

  it('lets the control take over the outer field when the field tokens are left out', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { stray } = await openInsideField(HalfWrappedHost);

    expect(stray.hasAttribute('aria-labelledby')).toBe(true);
  });
});
