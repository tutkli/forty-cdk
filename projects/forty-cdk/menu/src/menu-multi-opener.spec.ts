import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { ForMenu } from './menu';
import { ForMenuContent } from './menu-content';
import { ForMenuItem } from './menu-item';

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu #row="forMenu" [(open)]="open" [disabled]="disabled()" ariaLabel="Row actions">
      <div data-testid="region" [forContextMenuTrigger]="row">Row</div>
      <button data-testid="kebab" [forDropdownMenuTrigger]="row">⋮</button>

      @if (open()) {
        <div data-testid="surface" forMenuContent>
          <button id="edit" forMenuItem (activate)="selected.set('edit')">Edit</button>
          <button id="remove" forMenuItem (activate)="selected.set('remove')">Delete</button>
        </div>
      }
    </div>
  `,
})
class SharedMenuHost {
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly selected = signal<string | null>(null);
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu #row="forMenu" [(open)]="open" (escapeKeyDown)="onEscape($event)">
      <div data-testid="region" [forContextMenuTrigger]="row">Row</div>
      <button data-testid="kebab" [forDropdownMenuTrigger]="row">⋮</button>

      @if (open()) {
        <div forMenuContent>
          <button id="edit" forMenuItem>Edit</button>
        </div>
      }
    </div>
  `,
})
class VetoingSharedMenuHost {
  readonly open = signal(false);
  readonly veto = signal(false);
  escapeCount = 0;

  onEscape(event: { preventDefault: () => void }): void {
    this.escapeCount += 1;
    if (this.veto()) {
      event.preventDefault();
    }
  }
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu #row="forMenu" [(open)]="open" [ariaLabel]="ariaLabel()">
      <div data-testid="region" [forContextMenuTrigger]="row">Row</div>
      <button data-testid="kebab" [forDropdownMenuTrigger]="row">⋮</button>

      @if (open()) {
        <div data-testid="surface" forMenuContent>
          <button id="edit" forMenuItem>Edit</button>
        </div>
      }
    </div>
  `,
})
class UnnamedSharedMenuHost {
  readonly open = signal(false);
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu [(open)]="open">
      <button data-testid="kebab" forDropdownMenuTrigger>⋮</button>
      @if (open()) {
        <div data-testid="surface" forMenuContent>
          <button id="edit" forMenuItem>Edit</button>
        </div>
      }
    </div>
  `,
})
class UnnamedButtonOnlySharedMenuHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu #row="forMenu" [(open)]="open">
      <div data-testid="region" [forContextMenuTrigger]="row">Row</div>
      <button data-testid="kebab" [forDropdownMenuTrigger]="row">⋮</button>

      <div data-testid="surface" forMenuContent>
        <button id="edit" forMenuItem>Edit</button>
      </div>
    </div>
  `,
})
class AlwaysMountedSharedMenuHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forMenu [(open)]="open">
      <button data-testid="kebab" forDropdownMenuTrigger>⋮</button>
      @if (open()) {
        <div data-testid="surface" forMenuContent aria-labelledby="external-heading">
          <button id="edit" forMenuItem>Edit</button>
        </div>
      }
    </div>
  `,
})
class StaticLabelledSharedMenuHost {
  readonly open = signal(false);
}

function rightClick(el: HTMLElement, x: number, y: number): MouseEvent {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 2, clientX: x, clientY: y }),
  );
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: x,
    clientY: y,
  });
  el.dispatchEvent(event);
  return event;
}

function pointerDown(el: HTMLElement | Document): void {
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

describe('ForMenu (multiple openers, one content block)', () => {
  afterEachOverlayCleanup();

  describe('shared content', () => {
    it('opens the single content block from either opener', async () => {
      const r = renderHost(SharedMenuHost);

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
      expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);

      pressKey(document, 'Escape');
      await r.flush();
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
      expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    });

    it('keeps exactly one instance open when the second opener fires', async () => {
      const r = renderHost(SharedMenuHost);

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();
      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();

      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
      expect(r.instance.open()).toBe(true);
    });

    it('activating an item from either opener runs the handler and closes', async () => {
      const r = renderHost(SharedMenuHost);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();
      document.querySelector<HTMLButtonElement>('#remove')!.click();
      await r.flush();

      expect(r.instance.selected()).toBe('remove');
      expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0);
    });

    it('reflects the shared open state on both openers', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;
      const region = r.query('[data-testid="region"]')!;

      expect(kebab.getAttribute('data-state')).toBe('closed');
      expect(region.getAttribute('data-state')).toBe('closed');

      rightClick(region, 40, 60);
      await r.flush();

      expect(kebab.getAttribute('data-state')).toBe('open');
      expect(region.getAttribute('data-state')).toBe('open');
    });
  });

  describe('per-opener ids', () => {
    it('gives each opener its own id', async () => {
      const r = renderHost(SharedMenuHost);
      await r.flush();

      const kebabId = r.query('[data-testid="kebab"]')!.getAttribute('id');
      const regionId = r.query('[data-testid="region"]')!.getAttribute('id');

      expect(kebabId).toBeTruthy();
      expect(regionId).toBeTruthy();
      expect(kebabId).not.toBe(regionId);
    });

    it('points the button opener aria-controls at the shared surface', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

      kebab.click();
      await r.flush();

      const surface = document.querySelector('[role="menu"]')!;
      expect(kebab.getAttribute('aria-controls')).toBe(surface.getAttribute('id'));
      expect(kebab.getAttribute('aria-expanded')).toBe('true');
    });

    it('lets an explicit ariaLabel name the shared surface for either opener', async () => {
      const r = renderHost(SharedMenuHost);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();

      let surface = document.querySelector('[role="menu"]')!;
      expect(surface.getAttribute('aria-label')).toBe('Row actions');
      expect(surface.getAttribute('aria-labelledby')).toBeNull();

      pressKey(document, 'Escape');
      await r.flush();
      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();

      surface = document.querySelector('[role="menu"]')!;
      expect(surface.getAttribute('aria-label')).toBe('Row actions');
      expect(surface.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('per-opener accessible name', () => {
    it('names the surface after a button opener when no ariaLabel is set', async () => {
      const r = renderHost(UnnamedSharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

      kebab.click();
      await r.flush();

      const surface = document.querySelector('[role="menu"]')!;
      expect(surface.getAttribute('aria-labelledby')).toBe(kebab.getAttribute('id'));
      expect(surface.getAttribute('aria-label')).toBeNull();
    });

    it('emits no name at all for a region-opened instance', async () => {
      const r = renderHost(UnnamedSharedMenuHost);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();

      const surface = document.querySelector('[role="menu"]')!;
      expect(surface.getAttribute('aria-labelledby')).toBeNull();
      expect(surface.getAttribute('aria-label')).toBeNull();
    });

    it('flips the fallback in both directions as the active opener changes', async () => {
      const r = renderHost(UnnamedSharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;
      const region = r.query('[data-testid="region"]')!;

      kebab.click();
      await r.flush();
      expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(
        kebab.getAttribute('id'),
      );

      pressKey(document, 'Escape');
      await r.flush();
      rightClick(region, 40, 60);
      await r.flush();
      expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBeNull();

      pressKey(document, 'Escape');
      await r.flush();
      kebab.click();
      await r.flush();
      expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(
        kebab.getAttribute('id'),
      );
    });

    it('re-evaluates the fallback on the very same mounted surface', async () => {
      const r = renderHost(AlwaysMountedSharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;
      const region = r.query('[data-testid="region"]')!;
      const surface = document.querySelector('[role="menu"]')!;

      kebab.click();
      await r.flush();
      expect(surface.getAttribute('aria-labelledby')).toBe(kebab.getAttribute('id'));

      rightClick(region, 40, 60);
      await r.flush();

      expect(document.querySelector('[role="menu"]')).toBe(surface);
      expect(surface.getAttribute('aria-labelledby')).toBeNull();
    });

    it('lets an explicit ariaLabel win over the button-opener fallback', async () => {
      const r = renderHost(UnnamedSharedMenuHost);
      r.instance.ariaLabel.set('Row actions');
      await r.flush();

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();

      const surface = document.querySelector('[role="menu"]')!;
      expect(surface.getAttribute('aria-label')).toBe('Row actions');
      expect(surface.getAttribute('aria-labelledby')).toBeNull();
    });

    it('names a button-only shared menu without any consumer setup', async () => {
      const r = renderHost(UnnamedButtonOnlySharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

      kebab.click();
      await r.flush();

      expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(
        kebab.getAttribute('id'),
      );
    });

    it('preserves a consumer-set static aria-labelledby over the fallback', async () => {
      const r = renderHost(StaticLabelledSharedMenuHost);

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();

      expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(
        'external-heading',
      );
    });
  });

  describe('return focus follows the active opener', () => {
    it('returns focus to the button opener that opened the menu', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

      kebab.click();
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();

      expect(document.activeElement).toBe(kebab);
    });

    it('returns focus to the right-click region that opened the menu', async () => {
      const r = renderHost(SharedMenuHost);
      const region = r.query('[data-testid="region"]')!;

      rightClick(region, 40, 60);
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();

      expect(document.activeElement).toBe(region);
    });

    it('switches the return-focus target when the other opener opens next', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;
      const region = r.query('[data-testid="region"]')!;

      kebab.click();
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();
      expect(document.activeElement).toBe(kebab);

      rightClick(region, 40, 60);
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();
      expect(document.activeElement).toBe(region);
    });
  });

  describe('per-opener dismissible exemption', () => {
    it('exempts the button opener so its own pointer-down does not double-close', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

      kebab.click();
      await r.flush();

      pointerDown(kebab);
      await r.flush();
      expect(r.instance.open()).toBe(true);
    });

    it('does not exempt the right-click region, so a left-click on it closes', async () => {
      const r = renderHost(SharedMenuHost);
      const region = r.query('[data-testid="region"]')!;

      rightClick(region, 40, 60);
      await r.flush();

      pointerDown(region);
      await r.flush();
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('dismiss plumbing from either opener', () => {
    it('emits (escapeKeyDown) and closes for a button-opened instance', async () => {
      const r = renderHost(VetoingSharedMenuHost);

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();

      expect(r.instance.escapeCount).toBe(1);
      expect(r.instance.open()).toBe(false);
    });

    it('honours an Escape veto for a right-click-opened instance', async () => {
      const r = renderHost(VetoingSharedMenuHost);
      r.instance.veto.set(true);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();
      pressKey(document, 'Escape');
      await r.flush();

      expect(r.instance.escapeCount).toBe(1);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('disabled', () => {
    it('blocks both openers while the root is disabled', async () => {
      const r = renderHost(SharedMenuHost);
      r.instance.disabled.set(true);
      await r.flush();

      r.query<HTMLButtonElement>('[data-testid="kebab"]')!.click();
      await r.flush();
      expect(r.instance.open()).toBe(false);

      rightClick(r.query('[data-testid="region"]')!, 40, 60);
      await r.flush();
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('zoneless', () => {
    it('keeps both openers reactive to the shared open model without zone.js', async () => {
      const r = renderHost(SharedMenuHost);
      const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;
      const region = r.query('[data-testid="region"]')!;

      r.instance.open.set(true);
      await r.flush();
      expect(kebab.getAttribute('aria-expanded')).toBe('true');
      expect(region.getAttribute('data-state')).toBe('open');

      r.instance.open.set(false);
      await r.flush();
      expect(kebab.getAttribute('aria-expanded')).toBe('false');
      expect(region.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('orphan errors', () => {
    it('throws when [forMenuContent] is used without a menu root', () => {
      @Component({
        imports: [ForMenuContent],
        template: `<div forMenuContent></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(/\[forMenu\], \[forDropdownMenu\]/);
    });
  });
});

describe('ForMenu (single opener)', () => {
  afterEachOverlayCleanup();

  @Component({
    imports: [ForMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
    template: `
      <div forMenu [(open)]="open" ariaLabel="Actions">
        <button data-testid="kebab" forDropdownMenuTrigger>⋮</button>
        @if (open()) {
          <div forMenuContent><button id="edit" forMenuItem>Edit</button></div>
        }
      </div>
    `,
  })
  class SingleOpenerHost {
    readonly open = signal(false);
  }

  it('resolves the root through DI and behaves like the presets', async () => {
    const r = renderHost(SingleOpenerHost);
    const kebab = r.query<HTMLButtonElement>('[data-testid="kebab"]')!;

    kebab.click();
    await flush(r.fixture);
    expect(document.activeElement?.id).toBe('edit');

    pressKey(document, 'Escape');
    await flush(r.fixture);
    expect(document.activeElement).toBe(kebab);
  });
});
