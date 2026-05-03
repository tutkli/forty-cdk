import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForToggleGroup } from '../toggle/toggle-group';
import { ForToggleGroupItem } from '../toggle/toggle-group-item';
import { ForToolbar } from './toolbar';
import { ForToolbarButton } from './toolbar-button';
import { ForToolbarLink } from './toolbar-link';
import { ForToolbarSeparator } from './toolbar-separator';

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToolbarLink, ForToolbarSeparator],
  template: `
    <div forToolbar [orientation]="orientation()" [dir]="dir()" [disabled]="disabled()">
      <button forToolbarButton>One</button>
      <button forToolbarButton [disabled]="middleDisabled()">Two</button>
      <span forToolbarSeparator></span>
      <a forToolbarLink href="/x">Three</a>
    </div>
  `,
})
class ToolbarHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly disabled = signal(false);
  readonly middleDisabled = signal(false);
}

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToggleGroup, ForToggleGroupItem],
  template: `
    <div forToolbar>
      <button forToolbarButton>Undo</button>
      <div forToggleGroup multiple>
        <button forToggleGroupItem value="bold">B</button>
        <button forToggleGroupItem value="italic">I</button>
      </div>
      <button forToolbarButton>Redo</button>
    </div>
  `,
})
class ToolbarWithGroupHost {}

function key(name: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
}

describe('ForToolbar', () => {
  describe('roles + reflection', () => {
    it('exposes role="toolbar" and reflects orientation', () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      const root = query<HTMLElement>('[forToolbar]')!;

      expect(root.getAttribute('role')).toBe('toolbar');
      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-orientation')).toBe('horizontal');

      fixture.componentInstance.orientation.set('vertical');
      flush();
      expect(root.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('reflects dir="rtl" on the host when set', () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.dir.set('rtl');
      flush();
      expect(query<HTMLElement>('[forToolbar]')!.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('roving tabindex', () => {
    it('only the first enabled item is in the tab sequence', () => {
      const { query, queryAll, flush } = renderHost(ToolbarHost);
      flush();

      const buttons = queryAll<HTMLButtonElement>('button');
      const link = query<HTMLAnchorElement>('a')!;
      expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('-1');
      expect(link.getAttribute('tabindex')).toBe('-1');
    });

    it('skips disabled items when computing the entry point', () => {
      @Component({
        imports: [ForToolbar, ForToolbarButton],
        template: `
          <div forToolbar>
            <button forToolbarButton disabled>One</button>
            <button forToolbarButton>Two</button>
          </div>
        `,
      })
      class Host {}

      const { queryAll, flush } = renderHost(Host);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('arrow-key navigation', () => {
    it('moves focus right with ArrowRight (horizontal)', () => {
      const { queryAll, flush } = renderHost(ToolbarHost);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      const link = document.querySelector<HTMLAnchorElement>('a')!;

      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(buttons[1]);

      buttons[1]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(link);
    });

    it('skips disabled items during arrow navigation', () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.middleDisabled.set(true);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      const link = document.querySelector<HTMLAnchorElement>('a')!;

      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(link);
    });

    it('RTL inverts ArrowLeft / ArrowRight', () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.dir.set('rtl');
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(key('ArrowLeft'));
      flush();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('Home / End jump to the first / last enabled item', () => {
      const { queryAll, flush } = renderHost(ToolbarHost);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      const link = document.querySelector<HTMLAnchorElement>('a')!;

      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(key('End'));
      flush();
      expect(document.activeElement).toBe(link);

      link.dispatchEvent(key('Home'));
      flush();
      expect(document.activeElement).toBe(buttons[0]);
    });
  });

  describe('toggle-group composition', () => {
    it('toggle items participate in the toolbar roving', () => {
      const { queryAll, flush } = renderHost(ToolbarWithGroupHost);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      // [Undo, B, I, Redo]
      expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[3]!.getAttribute('tabindex')).toBe('-1');

      buttons[0]!.focus();
      buttons[0]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(buttons[1]);
      buttons[1]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(buttons[2]);
      buttons[2]!.dispatchEvent(key('ArrowRight'));
      flush();
      expect(document.activeElement).toBe(buttons[3]);
    });

    it('toggle items keep their selection semantics inside a toolbar', () => {
      const { queryAll, flush } = renderHost(ToolbarWithGroupHost);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      buttons[1]!.click(); // bold
      flush();
      expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
      buttons[2]!.click(); // italic
      flush();
      expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
      // multiple — both still pressed
      expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('disabled toolbar', () => {
    it('disables every item when the toolbar is disabled', () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      expect(buttons[0]!.hasAttribute('disabled')).toBe(true);
      expect(buttons[1]!.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('separator', () => {
    it('inherits cross-axis orientation by default', () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      flush();

      const sep = query<HTMLElement>('[forToolbarSeparator]')!;
      // Horizontal toolbar → vertical separator (cross-axis).
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('data-orientation')).toBe('vertical');
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');

      // Vertical toolbar → horizontal separator (cross-axis). aria-orientation
      // is only emitted for 'vertical' (horizontal is the ARIA default).
      fixture.componentInstance.orientation.set('vertical');
      flush();
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('data-orientation')).toBe('horizontal');
      expect(sep.getAttribute('aria-orientation')).toBeNull();
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      const { fixture, query, queryAll, flush } = renderHost(ToolbarHost);
      flush();

      const root = query<HTMLElement>('[forToolbar]')!;
      const buttons = queryAll<HTMLButtonElement>('button');

      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(buttons[0]!.getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.orientation.set('vertical');
      flush();
      expect(root.getAttribute('aria-orientation')).toBe('vertical');
    });
  });
});
