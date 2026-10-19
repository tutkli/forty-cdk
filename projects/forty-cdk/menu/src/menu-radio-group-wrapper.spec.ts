import { Component, Directive, signal } from '@angular/core';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';

import { ForMenuContent } from './menu-content';
import { ForMenuGroup } from './menu-group';
import { FOR_MENU_GROUP_CONTEXT } from './menu-group-context';
import { ForMenuGroupLabel } from './menu-group-label';
import { ForMenuRadioGroup } from './menu-radio-group';
import { FOR_MENU_RADIO_GROUP_CONTEXT } from './menu-radio-group-context';
import { ForMenuRadioItem } from './menu-radio-item';

@Directive({
  selector: '[wrapperRadioGroup]',
  exportAs: 'wrapperRadioGroup',
  providers: [
    { provide: FOR_MENU_RADIO_GROUP_CONTEXT, useExisting: WrapperRadioGroup },
    { provide: FOR_MENU_GROUP_CONTEXT, useExisting: WrapperRadioGroup },
  ],
})
class WrapperRadioGroup extends ForMenuRadioGroup {}

@Directive({
  selector: '[halfWrappedRadioGroup]',
  providers: [{ provide: FOR_MENU_RADIO_GROUP_CONTEXT, useExisting: HalfWrappedRadioGroup }],
})
class HalfWrappedRadioGroup extends ForMenuRadioGroup {}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuGroupLabel,
    ForMenuRadioItem,
    WrapperRadioGroup,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Sort</button>
      @if (open()) {
        <div forMenuContent>
          <div wrapperRadioGroup [(value)]="sortBy" data-test-id="group">
            <div forMenuGroupLabel data-test-id="label">Sort by</div>
            <button forMenuRadioItem value="name" data-test-id="name">Name</button>
            <button forMenuRadioItem value="date" data-test-id="date">Date</button>
          </div>
        </div>
      }
    </div>
  `,
})
class WrapperHost {
  readonly open = signal(true);
  readonly sortBy = signal<string | null>('name');
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuGroupLabel,
    ForMenuRadioItem,
    HalfWrappedRadioGroup,
  ],
  template: `
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Sort</button>
      <div forMenuContent>
        <div halfWrappedRadioGroup>
          <div forMenuGroupLabel>Sort by</div>
          <button forMenuRadioItem value="name">Name</button>
        </div>
      </div>
    </div>
  `,
})
class HalfWrappedHost {}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuRadioItem,
    HalfWrappedRadioGroup,
  ],
  template: `
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Sort</button>
      <div forMenuContent>
        <div forMenuGroup data-test-id="outer">
          <div halfWrappedRadioGroup data-test-id="group">
            <div forMenuGroupLabel data-test-id="label">Sort by</div>
            <button forMenuRadioItem value="name">Name</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
class HalfWrappedInGroupHost {}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;

describe('ForMenuRadioGroup subclass wrapper (#2321)', () => {
  afterEachOverlayCleanup();

  it('labels the subclass with its group label', async () => {
    const r = renderHost(WrapperHost);
    await r.flush();

    expect(byTestId('group').getAttribute('aria-labelledby')).toBe(byTestId('label').id);
  });

  it('selects through the subclassed group', async () => {
    const r = renderHost(WrapperHost);
    await r.flush();

    byTestId('date').click();
    await r.flush();

    expect(r.instance.sortBy()).toBe('date');
  });

  it('fails its group label when FOR_MENU_GROUP_CONTEXT is left out', () => {
    expect(() => renderHost(HalfWrappedHost)).toThrow(/FORCDK-MENU-002/);
  });

  it('labels an enclosing group instead when FOR_MENU_GROUP_CONTEXT is left out', async () => {
    const r = renderHost(HalfWrappedInGroupHost);
    await r.flush();

    expect(byTestId('outer').getAttribute('aria-labelledby')).toBe(byTestId('label').id);
    expect(byTestId('group').hasAttribute('aria-labelledby')).toBe(false);
  });
});
