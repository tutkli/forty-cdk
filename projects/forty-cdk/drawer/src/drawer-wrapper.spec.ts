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

import { ForDrawer } from './drawer';
import { FOR_DRAWER_CONTEXT } from './drawer-context';

@Directive({
  selector: '[wrapperDrawer]',
  exportAs: 'wrapperDrawer',
  providers: [
    { provide: FOR_DRAWER_CONTEXT, useExisting: WrapperDrawer },
    { provide: FOR_FIELD_CONTEXT, useValue: null },
    { provide: FOR_FIELD_ANCHOR_CONTEXT, useValue: null },
  ],
})
class WrapperDrawer extends ForDrawer {}

@Directive({
  selector: '[halfWrappedDrawer]',
  providers: [{ provide: FOR_DRAWER_CONTEXT, useExisting: HalfWrappedDrawer }],
})
class HalfWrappedDrawer extends ForDrawer {}

interface OuterFieldHost {
  readonly open: WritableSignal<boolean>;
}

@Component({
  imports: [ForField, ForLabel, ForFieldControl, WrapperDrawer],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div wrapperDrawer [ariaLabel]="'Details'" (dismiss)="open.set(false)">
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
  imports: [ForField, ForLabel, ForFieldControl, HalfWrappedDrawer],
  template: `
    <div forField>
      <span forLabel>Outer</span>
      <input forFieldControl />
      @if (open()) {
        <div halfWrappedDrawer [ariaLabel]="'Details'" (dismiss)="open.set(false)">
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

describe('ForDrawer subclass wrapper (#2321)', () => {
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
