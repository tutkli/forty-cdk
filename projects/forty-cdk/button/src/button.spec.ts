import { Component, signal } from '@angular/core';
import { ForFieldset } from 'forty-cdk/fieldset';

import { renderHost } from '../../src/test-utils/render';
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

@Component({
  imports: [ForButton, ForFieldset],
  template: `<div forFieldset [disabled]="groupDisabled()">
    <button forButton [disabled]="ownDisabled()" (activate)="count.update((n) => n + 1)">
      Btn
    </button>
  </div>`,
})
class FieldsetNativeHost {
  readonly groupDisabled = signal(false);
  readonly ownDisabled = signal(false);
  readonly count = signal(0);
}

@Component({
  imports: [ForButton, ForFieldset],
  template: `<div forFieldset [disabled]="groupDisabled()">
    <div forButton (activate)="count.update((n) => n + 1)">Custom</div>
  </div>`,
})
class FieldsetCustomHost {
  readonly groupDisabled = signal(false);
  readonly count = signal(0);
}

@Component({
  imports: [ForButton, ForFieldset],
  template: `<div forFieldset [disabled]="outer()">
    <div forFieldset [disabled]="inner()">
      <button forButton (activate)="count.update((n) => n + 1)">Btn</button>
    </div>
  </div>`,
})
class NestedFieldsetHost {
  readonly outer = signal(false);
  readonly inner = signal(false);
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
    it('fires activate on Enter keydown on a <div> host and calls preventDefault', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      div.dispatchEvent(event);
      await r.flush();
      expect(r.instance.count()).toBe(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not fire activate on Space keydown but calls preventDefault to block scroll', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      div.dispatchEvent(event);
      await r.flush();
      expect(r.instance.count()).toBe(0);
      expect(event.defaultPrevented).toBe(true);
    });

    it('fires activate exactly once on Space keyup after a keydown on a <div> host', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );
      const up = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true });
      div.dispatchEvent(up);
      await r.flush();
      expect(r.instance.count()).toBe(1);
      expect(up.defaultPrevented).toBe(true);
    });

    it('does not fire activate on a Space keyup without a preceding keydown', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });

    it('does not fire activate on a non-activation key on a <div> host', async () => {
      const r = renderHost(CustomActivateHost);
      const div = r.query<HTMLElement>('[forButton]')!;

      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });
  });

  describe('non-button disabled keyboard activation', () => {
    it('preventDefaults Space keydown even when disabled and never activates on keydown or keyup', async () => {
      const r = renderHost(CustomActivateHost);
      r.instance.disabled.set(true);
      await r.flush();

      const div = r.query<HTMLElement>('[forButton]')!;
      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      div.dispatchEvent(down);
      await r.flush();
      expect(down.defaultPrevented).toBe(true);
      expect(r.instance.count()).toBe(0);

      div.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });

    it('does not activate on Enter keydown when disabled', async () => {
      const r = renderHost(CustomActivateHost);
      r.instance.disabled.set(true);
      await r.flush();

      const div = r.query<HTMLElement>('[forButton]')!;
      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });
  });

  describe('native button: directive does not synthesize keyboard activation', () => {
    it('ignores keydown and keyup so the platform owns keyboard → click', async () => {
      const r = renderHost(ActivateHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;

      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      btn.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
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

  describe('fieldset disabled composition', () => {
    it('reflects aria-disabled and data-disabled when the surrounding fieldset is disabled', async () => {
      const r = renderHost(FieldsetNativeHost);
      r.instance.groupDisabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('data-disabled')).toBe('');
    });

    it('suppresses activate on click while the surrounding fieldset is disabled', async () => {
      const r = renderHost(FieldsetNativeHost);
      r.instance.groupDisabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(0);

      r.instance.groupDisabled.set(false);
      await r.flush();

      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(1);
    });

    it('never emits the native disabled attribute inside a disabled fieldset', async () => {
      const r = renderHost(FieldsetNativeHost);
      r.instance.groupDisabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.hasAttribute('disabled')).toBe(false);
      expect(btn.disabled).toBe(false);
    });

    it('a non-button host inside a disabled fieldset ignores Enter and still preventDefaults Space', async () => {
      const r = renderHost(FieldsetCustomHost);
      r.instance.groupDisabled.set(true);
      await r.flush();

      const div = r.query<HTMLElement>('[forButton]')!;
      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);

      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      div.dispatchEvent(down);
      await r.flush();
      expect(down.defaultPrevented).toBe(true);
      expect(r.instance.count()).toBe(0);

      div.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });

    it('a disabled fieldset suppresses data-hovered and data-pressed', async () => {
      const r = renderHost(FieldsetCustomHost);
      r.instance.groupDisabled.set(true);
      await r.flush();

      const div = r.query<HTMLElement>('[forButton]')!;
      div.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', bubbles: true }));
      div.dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', bubbles: true }),
      );
      await r.flush();

      expect(div.hasAttribute('data-hovered')).toBe(false);
      expect(div.hasAttribute('data-pressed')).toBe(false);
    });

    it('the button own disabled still wins when the fieldset is enabled', async () => {
      const r = renderHost(FieldsetNativeHost);
      r.instance.ownDisabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');

      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(0);
    });

    it('a disabled outer fieldset cannot be re-enabled by an inner one', async () => {
      const r = renderHost(NestedFieldsetHost);
      r.instance.outer.set(true);
      r.instance.inner.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');

      r.instance.inner.set(false);
      await r.flush();
      expect(btn.getAttribute('aria-disabled')).toBe('true');

      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(0);

      r.instance.outer.set(false);
      await r.flush();
      expect(btn.hasAttribute('aria-disabled')).toBe(false);

      btn.click();
      await r.flush();
      expect(r.instance.count()).toBe(1);
    });

    it('a button outside any fieldset is unaffected', async () => {
      const r = renderHost(NativeButtonHost);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.hasAttribute('aria-disabled')).toBe(false);
      expect(btn.hasAttribute('data-disabled')).toBe(false);
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

    it('reflects a fieldset disabled flip without Zone.js', async () => {
      const r = renderHost(FieldsetNativeHost);
      const btn = r.query<HTMLButtonElement>('[forButton]')!;
      expect(btn.hasAttribute('aria-disabled')).toBe(false);

      r.instance.groupDisabled.set(true);
      await r.flush();
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('data-disabled')).toBe('');

      r.instance.groupDisabled.set(false);
      await r.flush();
      expect(btn.hasAttribute('aria-disabled')).toBe(false);
      expect(btn.hasAttribute('data-disabled')).toBe(false);
    });
  });
});
