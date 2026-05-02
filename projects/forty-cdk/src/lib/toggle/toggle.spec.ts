import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForToggle } from './toggle';

@Component({
  imports: [ForToggle],
  template: `
    <button forToggle [(pressed)]="pressed" [disabled]="disabled()">B</button>
  `,
})
class ToggleHost {
  readonly pressed = signal(false);
  readonly disabled = signal(false);
}

describe('ForToggle', () => {
  describe('a11y baseline', () => {
    it('reflects aria-pressed and data-state on the host', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.getAttribute('data-state')).toBe('unchecked');
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('reflects pressed state changes', async () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      r.instance.pressed.set(true);
      r.flush();

      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-state')).toBe('checked');
    });

    it('reflects disabled via aria-disabled, [disabled], and data-disabled', () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      r.flush();

      const btn = r.query<HTMLButtonElement>('[forToggle]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.hasAttribute('disabled')).toBe(true);
      expect(btn.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('click', () => {
    it('toggles pressed on click', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      r.flush();
      expect(r.instance.pressed()).toBe(true);

      btn.click();
      r.flush();
      expect(r.instance.pressed()).toBe(false);
    });

    it('does not toggle when disabled', () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      r.flush();
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      r.flush();
      expect(r.instance.pressed()).toBe(false);
    });
  });

  describe('two-way binding', () => {
    it('honors consumer writes without re-emitting (pressedChange)', () => {
      let internalEmits = 0;

      @Component({
        imports: [ForToggle],
        template: `
          <button forToggle [(pressed)]="pressed" (pressedChange)="onChange($event)">B</button>
        `,
      })
      class Host {
        readonly pressed = signal(false);
        onChange(_: boolean): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer write — must NOT fire.
      r.instance.pressed.set(true);
      r.flush();
      expect(internalEmits).toBe(0);

      // User click — internal transition, must fire once.
      r.query<HTMLButtonElement>('[forToggle]')!.click();
      r.flush();
      expect(internalEmits).toBe(1);
    });
  });
});
