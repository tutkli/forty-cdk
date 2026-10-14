import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { installObserverPolyfills } from 'forty-cdk/testing';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

import { afterEachOverlayCleanup, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

interface OpenHost {
  readonly open: WritableSignal<boolean>;
}

interface HoverOverlayCase {
  readonly name: string;
  readonly host: Type<OpenHost>;
  readonly closedRows: Type<unknown>;
  readonly trigger: string;
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <div forTooltip [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <button type="button" forTooltipTrigger>Trigger</button>
      @if (open()) {
        <div forTooltipContent>Hint</div>
      }
    </div>
  `,
})
class TooltipHost implements OpenHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span forHoverCard [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <a forHoverCardTrigger href="/x">Trigger</a>
      @if (open()) {
        <div forHoverCardContent>Card</div>
      }
    </span>
  `,
})
class HoverCardHost implements OpenHost {
  readonly open = signal(false);
}

const ROWS = Array.from({ length: 50 }, (_, index) => index);

@Component({
  imports: [ForTooltip, ForTooltipTrigger],
  template: `
    @for (row of rows; track row) {
      <div forTooltip>
        <button type="button" forTooltipTrigger>Row {{ row }}</button>
      </div>
    }
  `,
})
class ClosedTooltipRows {
  readonly rows = ROWS;
}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger],
  template: `
    @for (row of rows; track row) {
      <span forHoverCard>
        <a forHoverCardTrigger href="/x">Row {{ row }}</a>
      </span>
    }
  `,
})
class ClosedHoverCardRows {
  readonly rows = ROWS;
}

const CASES: readonly HoverOverlayCase[] = [
  {
    name: '[forTooltip]',
    host: TooltipHost,
    closedRows: ClosedTooltipRows,
    trigger: '[forTooltipTrigger]',
  },
  {
    name: '[forHoverCard]',
    host: HoverCardHost,
    closedRows: ClosedHoverCardRows,
    trigger: '[forHoverCardTrigger]',
  },
];

describe('hover overlay adopters of the shared scroll and grace helpers', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  afterEachOverlayCleanup();

  let log: HTMLElement;
  beforeEach(() => {
    log = document.createElement('div');
    log.style.overflow = 'auto';
    document.body.appendChild(log);
  });
  afterEach(() => {
    log.remove();
  });

  for (const { name, host, closedRows, trigger } of CASES) {
    it(`${name} opens on hover while an unrelated container scrolls`, async () => {
      const { instance, flush } = renderHost(host);
      await flush();

      log.dispatchEvent(new Event('scroll'));
      document.querySelector<HTMLElement>(trigger)!.dispatchEvent(new PointerEvent('pointerenter'));
      await flush();

      expect(instance.open()).toBe(true);
    });

    it(`${name} closes once a pen leaves the trigger away from the surface`, async () => {
      const { instance, flush } = renderHost(host);
      await flush();
      const triggerEl = document.querySelector<HTMLElement>(trigger)!;

      triggerEl.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'pen' }));
      await flush();
      expect(instance.open()).toBe(true);

      triggerEl.dispatchEvent(
        new PointerEvent('pointerleave', { pointerType: 'pen', clientX: 0, clientY: 0 }),
      );
      await flush();
      document.dispatchEvent(
        new PointerEvent('pointermove', { pointerType: 'pen', clientX: 9999, clientY: 9999 }),
      );
      await flush();

      expect(instance.open()).toBe(false);
    });

    it(`${name} does no containment work for closed instances on a scroll`, async () => {
      const { flush } = renderHost(closedRows);
      await flush();
      const contains = vi.spyOn(Node.prototype, 'contains');

      document.dispatchEvent(new Event('scroll'));
      log.dispatchEvent(new Event('scroll'));

      expect(contains).not.toHaveBeenCalled();
    });
  }
});

function hoverIntentRoots(): Array<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(
    ([, code]) =>
      !code.includes('export function createHoverIntent(') &&
      /[^A-Za-z]createHoverIntent\(/.test(code),
  );
}

const OWN_KEEP_ALIVE_STATE = /#(?:trigger|content)(?:Hovered|Focused)\b|#detachGrace\b/;

describe('hover-intent roots keep their keep-alive state in createHoverSurfaceState', () => {
  const roots = hoverIntentRoots();

  it('finds the hover-intent roots in library source', () => {
    expect(roots.length).toBeGreaterThanOrEqual(2);
  });

  for (const [path, code] of roots) {
    it(`${path} builds its keep-alive state with createHoverSurfaceState`, () => {
      expect(code).toMatch(/[^A-Za-z]createHoverSurfaceState\(/);
    });

    it(`${path} declares no hover, focus or grace state of its own`, () => {
      expect(code.match(OWN_KEEP_ALIVE_STATE)).toBeNull();
    });
  }
});
