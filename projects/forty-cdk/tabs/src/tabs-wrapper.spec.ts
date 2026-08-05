import { Component, Directive } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { pressKey, renderHost } from '../../src/test-utils';

import { ForTabs } from './tabs';
import { ForTabsContent } from './tabs-content';
import { FOR_TABS_CONTEXT } from './tabs-context';
import { ForTabsList } from './tabs-list';
import { ForTabsTrigger } from './tabs-trigger';

@Directive({
  selector: '[wrapperTabs]',
  exportAs: 'wrapperTabs',
  providers: [{ provide: FOR_TABS_CONTEXT, useExisting: WrapperTabs }],
  host: { class: 'wrapper-tabs' },
})
class WrapperTabs extends ForTabs {}

@Directive({ selector: '[wrapperTabsList]', hostDirectives: [ForTabsList] })
class WrapperTabsList {}

@Directive({
  selector: '[wrapperTabsTrigger]',
  hostDirectives: [{ directive: ForTabsTrigger, inputs: ['value'] }],
})
class WrapperTabsTrigger {}

@Directive({
  selector: '[wrapperTabsContent]',
  hostDirectives: [{ directive: ForTabsContent, inputs: ['value'] }],
})
class WrapperTabsContent {}

@Component({
  imports: [WrapperTabs, WrapperTabsList, WrapperTabsTrigger, WrapperTabsContent],
  template: `
    <div wrapperTabs value="a">
      <div wrapperTabsList>
        <button wrapperTabsTrigger value="a" data-testid="trigger-a">A</button>
        <button wrapperTabsTrigger value="b" data-testid="trigger-b">B</button>
      </div>
      <div wrapperTabsContent value="a" data-testid="panel-a">Panel A</div>
      <div wrapperTabsContent value="b" data-testid="panel-b">Panel B</div>
    </div>
  `,
})
class WrapperHost {}

describe('ForTabs subclass wrapper (#1593)', () => {
  it('mounts a subclassed root that re-provides FOR_TABS_CONTEXT by hand', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperTabsList]')?.getAttribute('role')).toBe('tablist');
  });

  it('pairs each trigger with its panel through the subclass registries', () => {
    const { el } = renderHost(WrapperHost);

    const trigger = el.querySelector<HTMLElement>('[data-testid="trigger-a"]');
    const panel = el.querySelector<HTMLElement>('[data-testid="panel-a"]');

    expect(panel?.id).toBeTruthy();
    expect(trigger?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.getAttribute('aria-labelledby')).toBe(trigger?.id);
  });

  it('gives the registered triggers a single tab stop', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[data-testid="trigger-a"]')?.getAttribute('tabindex')).toBe('0');
    expect(el.querySelector('[data-testid="trigger-b"]')?.getAttribute('tabindex')).toBe('-1');
  });

  it('navigates between the triggers registered with the subclass', async () => {
    const { el, flush } = renderHost(WrapperHost);

    const first = el.querySelector<HTMLElement>('[data-testid="trigger-a"]')!;
    const second = el.querySelector<HTMLElement>('[data-testid="trigger-b"]')!;
    first.focus();

    pressKey(first, 'ArrowRight');
    await flush();

    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-selected')).toBe('true');
  });
});
