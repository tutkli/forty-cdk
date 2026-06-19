import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForButton } from './button';

@Component({
  imports: [ForButton],
  template: `<button forButton>Native</button>`,
})
class NativeButtonHost {}

@Component({
  imports: [ForButton],
  template: `<button type="submit" forButton>Submit</button>`,
})
class NativeSubmitButtonHost {}

@Component({
  imports: [ForButton],
  template: `<div forButton>Custom</div>`,
})
class CustomHost {}

@Component({
  imports: [ForButton],
  template: `<button forButton [disabled]="disabled()">Btn</button>`,
})
class DisabledHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForButton],
  template: `<button forButton [disabled]="disabled()" (activate)="count.update((n) => n + 1)">
    Btn
  </button>`,
})
class ActivateHost {
  readonly disabled = signal(false);
  readonly count = signal(0);
}

@Component({
  imports: [ForButton],
  template: `<div forButton [disabled]="disabled()" (activate)="count.update((n) => n + 1)">
    Custom
  </div>`,
})
class CustomActivateHost {
  readonly disabled = signal(false);
  readonly count = signal(0);
}

describe('ForButton', () => {
  describe('native button: type, no role, no tabindex', () => {
    it('sets type="button", no role, no tabindex on a native <button>', () => {
      const r = renderHost(NativeButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn.hasAttribute('role')).toBe(false);
      expect(btn.hasAttribute('tabindex')).toBe(false);
    });
  });

  describe('native button: preserves consumer type', () => {
    it('keeps consumer-set type="submit" on a native <button>', () => {
      const r = renderHost(NativeSubmitButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('type')).toBe('submit');
    });
  });

  describe('non-button host: role + tabindex', () => {
    it('adds role="button" and tabindex="0" on a <div> and no type attribute', () => {
      const r = renderHost(CustomHost);
      const div = r.query<HTMLElement>('[forButton]')!;
      expect(div.getAttribute('role')).toBe('button');
      expect(div.getAttribute('tabindex')).toBe('0');
      expect(div.hasAttribute('type')).toBe(false);
    });
  });

  describe('disabled reflection', () => {
    it('reflects aria-disabled and data-disabled when disabled=true', async () => {
      const r = renderHost(DisabledHost);
      r.instance.disabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('data-disabled')).toBe('');
    });

    it('does not reflect aria-disabled or data-disabled when disabled=false', async () => {
      const r = renderHost(DisabledHost);
      r.instance.disabled.set(false);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.hasAttribute('aria-disabled')).toBe(false);
      expect(btn.hasAttribute('data-disabled')).toBe(false);
    });
  });

  describe('disabled never emits native disabled', () => {
    it('a disabled forButton does not gain the native disabled attribute', async () => {
      const r = renderHost(DisabledHost);
      r.instance.disabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.hasAttribute('disabled')).toBe(false);
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('activate output', () => {
    it('fires activate on click when enabled', async () => {
      const r = renderHost(ActivateHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(1);
    });

    it('does not fire activate on click when disabled', async () => {
      const r = renderHost(ActivateHost);
      r.instance.disabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });
  });

  describe('non-button Enter/Space synthesize activation', () => {
    it('fires activate on Enter keydown on a <div> host', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(1);
    });

    it('fires activate on Space keydown on a <div> host', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(1);
    });

    it('does not fire activate on a non-activation key on a <div> host', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });
  });

  describe('data-pressed reflects pointer press', () => {
    it('is present after pointerdown and absent after pointerup', async () => {
      const r = renderHost(NativeButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      btn.dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', bubbles: true }),
      );
      await r.flush();
      expect(btn.hasAttribute('data-pressed')).toBe(true);

      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await r.flush();
      expect(btn.hasAttribute('data-pressed')).toBe(false);
    });
  });

  describe('data-hovered reflects hover', () => {
    it('is present on mouse pointerenter and absent on pointerleave', async () => {
      const r = renderHost(NativeButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      btn.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', bubbles: true }));
      await r.flush();
      expect(btn.hasAttribute('data-hovered')).toBe(true);

      btn.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      await r.flush();
      expect(btn.hasAttribute('data-hovered')).toBe(false);
    });

    it('is NOT present on touch pointerenter', async () => {
      const r = renderHost(NativeButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      btn.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch', bubbles: true }));
      await r.flush();
      expect(btn.hasAttribute('data-hovered')).toBe(false);
    });
  });

  describe('data-focus-visible on keyboard focus', () => {
    it('is present after a keyboard Tab followed by focusin', async () => {
      const r = renderHost(NativeButtonHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await r.flush();

      expect(btn.hasAttribute('data-focus-visible')).toBe(true);
    });
  });

  describe('zoneless reactivity', () => {
    it('fires activate on click and reflects disabled without Zone.js', async () => {
      const r = renderHost(ActivateHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(1);

      r.instance.disabled.set(true);
      await r.flush();

      btn.click();
      await r.flush();

      expect(r.instance.count()).toBe(1);
      expect(btn.hasAttribute('aria-disabled')).toBe(true);
      expect(btn.hasAttribute('data-disabled')).toBe(true);
    });
  });
});
