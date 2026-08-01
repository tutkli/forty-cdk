import { Component, signal } from '@angular/core';

import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';

import { hydrationHarness, settleHydration } from '../../test-utils';

@Component({
  selector: 'for-hydration-ids',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure [open]="true">
      <button forDisclosureTrigger data-testid="split-trigger">Split</button>
      @defer (hydrate never) {
        <section forDisclosureContent data-testid="split-content">Split body</section>
      }
    </div>

    <div forDisclosure [open]="true">
      <button forDisclosureTrigger id="pinned-trigger" data-testid="pinned-trigger">Pinned</button>
      @defer (hydrate never) {
        <section forDisclosureContent id="pinned-content" data-testid="pinned-content">
          Pinned body
        </section>
      }
    </div>

    @defer (hydrate never) {
      <div forDisclosure [open]="true">
        <button forDisclosureTrigger data-testid="first-trigger">First</button>
        <section forDisclosureContent data-testid="first-content">First body</section>
      </div>
    }

    @defer (hydrate when hydrateSecond()) {
      <div forDisclosure [open]="true">
        <button forDisclosureTrigger data-testid="second-trigger">Second</button>
        @defer (hydrate never) {
          <section forDisclosureContent data-testid="second-content">Second body</section>
        }
      </div>
    }
  `,
})
class IdWiringFixture {
  readonly hydrateSecond = signal(false);
}

@Component({
  selector: 'for-hydration-activedescendant',
  imports: [ForListbox, ForListboxOption],
  template: `
    <div forListbox aria-label="Virtual" [totalCount]="3" data-testid="virtual-root">
      @defer (hydrate when hydrateOptions()) {
        <button forListboxOption value="a" [posInSet]="0" data-testid="virtual-a">A</button>
        <button forListboxOption value="b" [posInSet]="1" data-testid="virtual-b">B</button>
      }
    </div>
  `,
})
class ActiveDescendantFixture {
  readonly hydrateOptions = signal(false);
}

const WIRED_PAIRS = [
  ['split-trigger', 'split-content'],
  ['pinned-trigger', 'pinned-content'],
  ['first-trigger', 'first-content'],
  ['second-trigger', 'second-content'],
] as const;

function el(testid: string): HTMLElement {
  return document.querySelector(`[data-testid="${testid}"]`) as HTMLElement;
}

function referent(id: string | null): HTMLElement | null {
  return id === null ? null : document.querySelector(`[id="${id}"]`);
}

function focusIn(host: HTMLElement): void {
  host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

describe('incremental hydration — generated ids across a @defer boundary', () => {
  const harness = hydrationHarness();

  it('wires every aria-controls relationship in the server render', async () => {
    const { serverHtml } = await harness.renderThenHydrate(IdWiringFixture, 'for-hydration-ids');
    const parsed = new DOMParser().parseFromString(serverHtml, 'text/html');
    const at = (testid: string) => parsed.querySelector(`[data-testid="${testid}"]`);

    for (const [trigger, content] of WIRED_PAIRS) {
      const controls = at(trigger)?.getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      expect(controls).toBe(at(content)?.getAttribute('id'));
    }
  });

  it('keeps a generated id resolving when the minting root sits outside the boundary', async () => {
    await harness.renderThenHydrate(IdWiringFixture, 'for-hydration-ids');

    const controls = el('split-trigger').getAttribute('aria-controls');
    expect(controls).toBe(el('split-content').getAttribute('id'));
    expect(referent(controls)).toBe(el('split-content'));
  });

  it('pins a known limitation: a consumer static id on a dehydrated piece dangles', async () => {
    const { serverHtml } = await harness.renderThenHydrate(IdWiringFixture, 'for-hydration-ids');
    expect(serverHtml).toContain('aria-controls="pinned-content"');

    const controls = el('pinned-trigger').getAttribute('aria-controls');
    expect(el('pinned-content').getAttribute('id')).toBe('pinned-content');
    expect(controls).not.toBe('pinned-content');
    expect(referent(controls)).toBeNull();
  });

  it('adopts the server id on every piece that hydrates, whatever the client counter drew', async () => {
    const { appRef, instance } = await harness.renderThenHydrate(
      IdWiringFixture,
      'for-hydration-ids',
    );
    const serverTriggerId = el('second-trigger').getAttribute('id');
    const serverContentId = el('second-trigger').getAttribute('aria-controls');

    instance.hydrateSecond.set(true);
    await settleHydration(appRef);

    expect(el('second-trigger').getAttribute('id')).toBe(serverTriggerId);
    expect(el('second-content').getAttribute('id')).toBe(serverContentId);

    expect(el('second-trigger').getAttribute('aria-expanded')).toBe('true');
    el('second-trigger').click();
    await settleHydration(appRef);
    expect(el('second-trigger').getAttribute('aria-expanded')).toBe('false');
  });

  it('pins a known limitation: blocks hydrating out of order re-point an id at a foreign element', async () => {
    const { appRef, instance } = await harness.renderThenHydrate(
      IdWiringFixture,
      'for-hydration-ids',
    );
    const serverContentId = el('second-trigger').getAttribute('aria-controls');

    instance.hydrateSecond.set(true);
    await settleHydration(appRef);

    const controls = el('second-trigger').getAttribute('aria-controls');
    expect(controls).not.toBe(serverContentId);
    expect(controls).toBe(el('first-content').getAttribute('id'));
    expect(referent(controls)).toBe(el('first-content'));
    expect(referent(controls)).not.toBe(el('second-content'));
  });
});

describe('incremental hydration — virtualized aria-activedescendant across a @defer boundary', () => {
  const harness = hydrationHarness();

  it('emits no aria-activedescendant server-side', async () => {
    const { serverHtml } = await harness.renderThenHydrate(
      ActiveDescendantFixture,
      'for-hydration-activedescendant',
    );

    expect(serverHtml).toContain('data-testid="virtual-a"');
    expect(serverHtml).not.toContain('aria-activedescendant');
  });

  it('emits none while the options are dehydrated, then resolves to the server-rendered option id', async () => {
    const { appRef, instance } = await harness.renderThenHydrate(
      ActiveDescendantFixture,
      'for-hydration-activedescendant',
    );
    const serverOptionId = el('virtual-a').getAttribute('id');
    expect(serverOptionId).toBeTruthy();

    focusIn(el('virtual-root'));
    await settleHydration(appRef);
    expect(el('virtual-root').hasAttribute('aria-activedescendant')).toBe(false);

    instance.hydrateOptions.set(true);
    await settleHydration(appRef);
    focusIn(el('virtual-root'));
    await settleHydration(appRef);

    const active = el('virtual-root').getAttribute('aria-activedescendant');
    expect(active).toBe(serverOptionId);
    expect(referent(active)).toBe(el('virtual-a'));
  });
});
