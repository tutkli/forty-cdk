import { Component, signal } from '@angular/core';

import { ForDialog } from 'forty-cdk/dialog';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForTable, ForTableCell, ForTableRow } from 'forty-cdk/table';
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
  'core-anchored/src/overlay-controller/overlay-shell.ts',
  'core/src/focus-trap/focus-trap.ts',
];

function modelOwners(): ReadonlyArray<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(
    ([path]) =>
      path !== MODEL && ['core', 'core-overlay', 'core-anchored'].includes(entryPointOf(path)),
  );
}

function modulesMatching(pattern: RegExp): string[] {
  return modelOwners()
    .filter(([, code]) => pattern.test(code))
    .map(([path]) => path)
    .sort();
}

const DISABLED_STATE_SCOPE = ['core', 'core-overlay', 'core-anchored', 'table'];
const DISABLED_STATE_READ = /:disabled\b|fieldset\[disabled\]/;

function disabledStateReaders(): string[] {
  return [...LIBRARY_CODE]
    .filter(
      ([path, code]) =>
        path !== MODEL &&
        DISABLED_STATE_SCOPE.includes(entryPointOf(path)) &&
        DISABLED_STATE_READ.test(code),
    )
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

@Component({
  imports: [ForDialog],
  template: `
    <button type="button" data-test-id="page">page</button>
    <div forDialog ariaLabel="Profile">
      <fieldset disabled><input data-test-id="locked" /></fieldset>
      <input data-test-id="name" />
      <button type="button" data-test-id="save">Save</button>
    </div>
  `,
})
class LockedModalDialogHost {}

@Component({
  imports: [ForDialog],
  template: `
    <button type="button" data-test-id="page">page</button>
    <div forDialog [modal]="false" ariaLabel="Profile">
      <fieldset disabled><input data-test-id="locked" /></fieldset>
      <input data-test-id="name" />
    </div>
  `,
})
class LockedNonModalDialogHost {}

@Component({
  imports: [ForDialog],
  template: `
    <button type="button" data-test-id="page">page</button>
    <div forDialog ariaLabel="Settings">
      <input data-test-id="first" />
      <details>
        <summary data-test-id="summary">More</summary>
        <button type="button" data-test-id="hidden">Reset</button>
      </details>
    </div>
  `,
})
class DetailsModalDialogHost {}

@Component({
  imports: [ForDialog],
  template: `
    <button type="button" data-test-id="page">page</button>
    <div forDialog [modal]="false" ariaLabel="Settings">
      <details>
        <button type="button" data-test-id="hidden">Reset</button>
        <summary data-test-id="summary">More</summary>
      </details>
    </div>
  `,
})
class DetailsNonModalDialogHost {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open">
      <button type="button" forPopoverTrigger data-test-id="trigger">Profile</button>
      @if (open()) {
        <div forPopoverContent>
          <input data-test-id="name" />
          <fieldset disabled><input data-test-id="locked" /></fieldset>
        </div>
      }
    </div>
  `,
})
class LockedPopoverHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open">
      <button type="button" forPopoverTrigger data-test-id="trigger">Settings</button>
      @if (open()) {
        <div forPopoverContent>
          <input data-test-id="first" />
          <details>
            <summary data-test-id="summary">More</summary>
            <button type="button" data-test-id="hidden">Reset</button>
          </details>
        </div>
      }
    </div>
  `,
})
class DetailsPopoverHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  template: `
    <table forTable mode="grid">
      <tbody>
        <tr forTableRow>
          <td forTableCell name="a" data-test-id="cell">
            <fieldset disabled><input data-test-id="locked" /></fieldset>
            <button type="button" data-test-id="edit">Edit</button>
            <details>
              <summary data-test-id="summary">More</summary>
              <button type="button" data-test-id="hidden">Reset</button>
            </details>
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
class ActionableCellHost {}

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

  it('reads disabled state only through the focusability model', () => {
    expect(LIBRARY_CODE.get(MODEL)).toMatch(DISABLED_STATE_READ);
    expect(disabledStateReaders()).toEqual([]);
  });

  describe('a modal whose first control sits in a disabled fieldset', () => {
    it('takes initial focus on the first enabled control', async () => {
      const r = renderHost(LockedModalDialogHost);
      await r.flush();

      expect(document.activeElement).toBe(query('name'));
    });

    it('wraps Tab from the last control to the first enabled one', async () => {
      const r = renderHost(LockedModalDialogHost);
      await r.flush();
      query('save').focus();

      const event = pressKey(query('save'), 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('name'));
    });
  });

  describe('a non-modal dialog whose first control sits in a disabled fieldset', () => {
    it('takes initial focus on the first enabled control', async () => {
      const r = renderHost(LockedNonModalDialogHost);
      await r.flush();

      expect(document.activeElement).toBe(query('name'));
    });
  });

  describe('a modal ending with a closed details element', () => {
    it('wraps Tab from the summary to the first control', async () => {
      const r = renderHost(DetailsModalDialogHost);
      await r.flush();
      query('summary').focus();

      const event = pressKey(query('summary'), 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('first'));
    });

    it('wraps Shift+Tab from the first control onto the summary', async () => {
      const r = renderHost(DetailsModalDialogHost);
      await r.flush();
      query('first').focus();

      const event = pressKey(query('first'), 'Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('summary'));
    });
  });

  describe('a non-modal dialog holding a closed details element whose content precedes its summary', () => {
    it('takes initial focus on the summary rather than the hidden content', async () => {
      const r = renderHost(DetailsNonModalDialogHost);
      await r.flush();

      expect(document.activeElement).toBe(query('summary'));
    });
  });

  describe('a popover whose last control sits in a disabled fieldset', () => {
    it('tabs out to the trigger and closes from the last enabled control', async () => {
      const r = renderHost(LockedPopoverHost);
      await r.flush();
      query('name').focus();

      pressKey(query('name'), 'Tab');
      await r.flush();

      expect(document.activeElement).toBe(query('trigger'));
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('a popover ending with a closed details element', () => {
    it('tabs out to the trigger and closes from the summary', async () => {
      const r = renderHost(DetailsPopoverHost);
      await r.flush();
      query('summary').focus();

      pressKey(query('summary'), 'Tab');
      await r.flush();

      expect(document.activeElement).toBe(query('trigger'));
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('an entered table cell holding a disabled fieldset and a closed details element', () => {
    it('enters on the first enabled widget', async () => {
      const r = renderHost(ActionableCellHost);
      await r.flush();
      query('cell').focus();

      pressKey(query('cell'), 'F2');
      await r.flush();

      expect(document.activeElement).toBe(query('edit'));
    });

    it('cycles Tab between the rendered widgets, skipping the hidden content', async () => {
      const r = renderHost(ActionableCellHost);
      await r.flush();
      query('cell').focus();
      pressKey(query('cell'), 'F2');
      await r.flush();

      const forward = pressKey(query('edit'), 'Tab');
      await r.flush();
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('summary'));

      const wrapped = pressKey(query('summary'), 'Tab');
      await r.flush();
      expect(wrapped.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(query('edit'));
    });
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
