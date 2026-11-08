import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';
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

interface SurfaceHost extends OpenHost {
  readonly openDelay: WritableSignal<number>;
  readonly closeDelay: WritableSignal<number>;
  readonly nestedOpen: WritableSignal<boolean>;
}

interface SurfaceCase {
  readonly name: string;
  readonly host: Type<SurfaceHost>;
  readonly trigger: string;
  readonly content: string;
}

@Component({
  imports: [
    ForTooltip,
    ForTooltipTrigger,
    ForTooltipContent,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
  ],
  template: `
    <div forTooltip [(open)]="open" [openDelay]="openDelay()" [closeDelay]="closeDelay()">
      <button type="button" forTooltipTrigger>Trigger</button>
      @if (open()) {
        <div forTooltipContent>
          <div forPopover [(open)]="nestedOpen" [returnFocus]="false">
            <button type="button" forPopoverTrigger>More</button>
            @if (nestedOpen()) {
              <div forPopoverContent>Nested</div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class TooltipSurfaceHost implements SurfaceHost {
  readonly open = signal(false);
  readonly openDelay = signal(0);
  readonly closeDelay = signal(0);
  readonly nestedOpen = signal(false);
}

@Component({
  imports: [
    ForHoverCard,
    ForHoverCardTrigger,
    ForHoverCardContent,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
  ],
  template: `
    <span forHoverCard [(open)]="open" [openDelay]="openDelay()" [closeDelay]="closeDelay()">
      <a forHoverCardTrigger href="/x">Trigger</a>
      @if (open()) {
        <div forHoverCardContent>
          <div forPopover [(open)]="nestedOpen" [returnFocus]="false">
            <button type="button" forPopoverTrigger>More</button>
            @if (nestedOpen()) {
              <div forPopoverContent>Nested</div>
            }
          </div>
        </div>
      }
    </span>
  `,
})
class HoverCardSurfaceHost implements SurfaceHost {
  readonly open = signal(false);
  readonly openDelay = signal(0);
  readonly closeDelay = signal(0);
  readonly nestedOpen = signal(false);
}

const SURFACE_CASES: readonly SurfaceCase[] = [
  {
    name: '[forTooltip]',
    host: TooltipSurfaceHost,
    trigger: '[forTooltipTrigger]',
    content: '[forTooltipContent]',
  },
  {
    name: '[forHoverCard]',
    host: HoverCardSurfaceHost,
    trigger: '[forHoverCardTrigger]',
    content: '[forHoverCardContent]',
  },
];

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

describe('hover-intent roots keep their surface state in step with the page', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  afterEachOverlayCleanup();

  afterEach(() => {
    vi.useRealTimers();
  });

  for (const { name, host, trigger, content } of SURFACE_CASES) {
    it(`${name} stays closed after an Escape pressed while its open is pending`, async () => {
      vi.useFakeTimers();
      const { instance, flush } = renderHost(host);
      instance.openDelay.set(700);
      await flush();

      document.querySelector<HTMLElement>(trigger)!.dispatchEvent(new PointerEvent('pointerenter'));
      await flush();
      pressKey(document.body, 'Escape');
      vi.advanceTimersByTime(800);
      await flush();

      expect(instance.open()).toBe(false);
    });

    it(`${name} still opens after an Escape that belongs to an IME composition`, async () => {
      vi.useFakeTimers();
      const { instance, flush } = renderHost(host);
      instance.openDelay.set(700);
      await flush();

      document.querySelector<HTMLElement>(trigger)!.dispatchEvent(new PointerEvent('pointerenter'));
      await flush();
      pressKey(document.body, 'Escape', { isComposing: true });
      vi.advanceTimersByTime(800);
      await flush();

      expect(instance.open()).toBe(true);
    });

    it(`${name} stays open past its close delay while a surface opened from its content is open`, async () => {
      vi.useFakeTimers();
      const { instance, flush } = renderHost(host);
      instance.closeDelay.set(300);
      await flush();
      const triggerEl = document.querySelector<HTMLElement>(trigger)!;
      triggerEl.dispatchEvent(new PointerEvent('pointerenter'));
      await flush();
      const contentEl = document.querySelector<HTMLElement>(content)!;
      contentEl.dispatchEvent(new PointerEvent('pointerenter'));
      triggerEl.dispatchEvent(new PointerEvent('pointerleave'));
      await flush();

      instance.nestedOpen.set(true);
      await flush();
      contentEl.dispatchEvent(new PointerEvent('pointerleave'));
      await flush();
      vi.advanceTimersByTime(400);
      await flush();
      expect(instance.open()).toBe(true);

      instance.nestedOpen.set(false);
      await flush();
      vi.advanceTimersByTime(400);
      await flush();
      expect(instance.open()).toBe(false);
    });
  }
});

function entryDir(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

function piecesOf(rootPath: string, marker: RegExp): Array<readonly [string, string]> {
  const dir = entryDir(rootPath);
  return [...LIBRARY_CODE].filter(
    ([path, code]) => path !== rootPath && path.startsWith(dir) && marker.test(code),
  );
}

describe('hover-intent pieces route through the shared surface state', () => {
  const roots = hoverIntentRoots();

  for (const [path] of roots) {
    const contents = piecesOf(path, /[^A-Za-z]injectOverlayShell\(/);
    const triggers = piecesOf(path, /[^A-Za-z]inject\([A-Z_]*TRIGGERS\)/);

    it(`${path} has a content piece and a trigger piece`, () => {
      expect(contents.length).toBeGreaterThanOrEqual(1);
      expect(triggers.length).toBeGreaterThanOrEqual(1);
    });

    for (const [contentPath, code] of contents) {
      it(`${contentPath} reports the surfaces opened from inside it to its root`, () => {
        expect(code).toMatch(
          /onNestedLayerRemoved:\s*\(\)\s*=>\s*this\.ctx\.nestedSurfaceClosed\(\)/,
        );
        expect(code).toMatch(
          /this\.ctx\.registerNestedSurfaces\(\s*\w+,\s*shell\.hasNestedLayer\s*\)/,
        );
      });
    }

    for (const [triggerPath, code] of triggers) {
      it(`${triggerPath} releases itself from its root when it unmounts`, () => {
        expect(code).toMatch(/\.releaseTrigger\(handle\.host\)/);
      });
    }
  }
});
