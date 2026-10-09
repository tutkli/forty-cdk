import { Component, signal } from '@angular/core';

import { ForDialog } from 'forty-cdk/dialog';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { pressKey } from 'forty-cdk/testing';

import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { renderHost } from '../test-utils/render';
import { LIBRARY_CODE, entryPointOf } from '../test-utils/source-scan';

const MODEL = 'core/src/focus-trap/focusable-candidate.ts';
const OBSERVER = 'core/src/focus-trap/focusable-content.ts';
const FOCUSABILITY = [
  'contenteditable',
  'controls',
  'disabled',
  'hidden',
  'href',
  'inert',
  'tabindex',
  'type',
];
const EDGE_CONSUMERS = [
  'core-overlay/src/overlay-controller/overlay-shell.ts',
  'core/src/focus-trap/focus-trap.ts',
];

function modelOwners(): ReadonlyArray<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(
    ([path]) => path !== MODEL && ['core', 'core-overlay'].includes(entryPointOf(path)),
  );
}

function modulesMatching(pattern: RegExp): string[] {
  return modelOwners()
    .filter(([, code]) => pattern.test(code))
    .map(([path]) => path)
    .sort();
}

function attributeFilterLiterals(): Array<readonly [string, string[]]> {
  const found: Array<readonly [string, string[]]> = [];
  for (const [path, code] of modelOwners()) {
    for (const match of code.matchAll(/attributeFilter:\s*\[([^\]]*)\]/g)) {
      found.push([path, [...match[1]!.matchAll(/['"]([\w-]+)['"]/g)].map((m) => m[1]!)] as const);
    }
  }
  return found;
}

@Component({
  imports: [ForDialog],
  template: `
    <button type="button">page</button>
    <div forDialog ariaLabel="Plan">
      <button type="button" data-test-id="first">first</button>
      <input type="radio" name="plan" value="a" data-test-id="r1" />
      <input type="radio" name="plan" value="b" data-test-id="r2" checked />
      <input type="radio" name="plan" value="c" data-test-id="r3" />
    </div>
  `,
})
class DialogHost {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open">
      <button type="button" forPopoverTrigger data-test-id="trigger">Plan</button>
      @if (open()) {
        <div forPopoverContent>
          <button type="button" data-test-id="first">first</button>
          <input type="radio" name="plan" value="a" data-test-id="r1" />
          <input type="radio" name="plan" value="b" data-test-id="r2" checked />
          <input type="radio" name="plan" value="c" data-test-id="r3" />
        </div>
      }
    </div>
  `,
})
class PopoverHost {
  readonly open = signal(true);
}

function query(testId: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;
}

describe('tabbable edges adopters', () => {
  afterEachOverlayCleanup();

  it('computes Tab edges only through findTabbableEdges', () => {
    expect(modulesMatching(/\bleavesTabSequence\(/)).toEqual(EDGE_CONSUMERS);
    expect(modulesMatching(/\bfindTabbableEdges\(/)).toEqual(EDGE_CONSUMERS);
    expect(modulesMatching(/\bisTabbableCandidate\(|\.tabIndex\s*(>=?|<=?)\s*-?\d/)).toEqual([]);
  });

  it('feeds the content observer the attribute list the model derives', () => {
    expect(LIBRARY_CODE.get(OBSERVER)).toMatch(
      /attributeFilter:\s*\[\s*\.\.\.FOCUSABILITY_ATTRIBUTES\s*\]/,
    );
    expect(LIBRARY_CODE.get(MODEL)).toMatch(/export const FOCUSABILITY_ATTRIBUTES\b/);
  });

  it('declares no focusability attribute list outside the model', () => {
    const literals = attributeFilterLiterals();

    expect(literals.length).toBeGreaterThan(0);
    expect(
      literals.filter(([, names]) => names.some((name) => FOCUSABILITY.includes(name))),
    ).toEqual([]);
  });

  describe('a modal whose last control is the checked radio of a group', () => {
    it('wraps Tab to the first control instead of letting it leave the modal', async () => {
      const r = renderHost(DialogHost);
      await r.flush();
      query('r2').focus();

      const event = pressKey(query('r2'), 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('first'));
    });

    it('wraps Shift+Tab from the first control onto the checked radio', async () => {
      const r = renderHost(DialogHost);
      await r.flush();
      query('first').focus();

      const event = pressKey(query('first'), 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('r2'));
    });
  });

  describe('a popover whose last control is the checked radio of a group', () => {
    it('tabs out to the trigger and closes', async () => {
      const r = renderHost(PopoverHost);
      await r.flush();
      query('r2').focus();

      pressKey(query('r2'), 'Tab');
      await r.flush();

      expect(document.activeElement).toBe(query('trigger'));
      expect(r.instance.open()).toBe(false);
    });
  });
});
