import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ForToggle } from 'forty-cdk';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'forty-cdk-docs-theme';

/**
 * Two-state theme toggle (light / dark). Persists the user's choice in
 * `localStorage` and falls back to `prefers-color-scheme` on first visit.
 *
 * The button is `[forToggle]` — the library directive owns `aria-pressed`,
 * `data-state`, and the click → toggle wiring. This component just bridges
 * the pressed signal to the document `dark` class + storage.
 *
 * SSR-safe: reads `localStorage` / `matchMedia` only in the browser. On the
 * server the initial value is `'light'`; the class is applied on first
 * browser tick.
 */
@Component({
  selector: 'for-docs-theme-toggle',
  imports: [ForToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      forToggle
      [(pressed)]="isDark"
      class="theme-toggle"
      [attr.aria-label]="ariaLabel()"
    >
      @if (isDark()) {
        <span aria-hidden="true">☀</span>
        <span class="sr-only">Switch to light mode</span>
      } @else {
        <span aria-hidden="true">☾</span>
        <span class="sr-only">Switch to dark mode</span>
      }
    </button>
  `,
  styles: `
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 1px solid var(--for-border);
      border-radius: var(--for-radius-sm);
      background: var(--for-surface-elevated);
      color: var(--for-on-surface-muted);
      cursor: pointer;
      transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
      font-size: 0.95rem;
    }
    .theme-toggle:hover {
      color: var(--for-on-surface);
      border-color: var(--for-border-strong);
    }
    .theme-toggle[data-state='checked'] {
      color: var(--for-on-surface);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class ThemeToggle {
  readonly #doc = inject(DOCUMENT);
  readonly #platformId = inject(PLATFORM_ID);

  protected readonly isDark = signal<boolean>(this.#readInitialTheme() === 'dark');

  protected readonly ariaLabel = computed(() =>
    this.isDark() ? 'Switch to light mode' : 'Switch to dark mode',
  );

  constructor() {
    effect(() => {
      const dark = this.isDark();
      const html = this.#doc.documentElement;
      if (!html) return;
      html.classList.toggle('dark', dark);
      if (isPlatformBrowser(this.#platformId)) {
        try {
          this.#doc.defaultView?.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
        } catch {
          // Storage can throw in private modes / iframes — silently ignore.
        }
      }
    });
  }

  #readInitialTheme(): Theme {
    if (!isPlatformBrowser(this.#platformId)) return 'light';
    try {
      const stored = this.#doc.defaultView?.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    const prefers = this.#doc.defaultView?.matchMedia('(prefers-color-scheme: dark)');
    return prefers?.matches ? 'dark' : 'light';
  }
}
