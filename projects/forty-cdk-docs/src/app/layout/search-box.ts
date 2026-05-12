import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ForDialog, ForDialogBackdrop, ForDialogClose } from 'forty-cdk';

/**
 * Pagefind UI mount. Lazy-loads `/_pagefind/pagefind-ui.js` on first open
 * (button click or `Cmd/Ctrl+K`), instantiates `PagefindUI` inside a real
 * `[forDialog]`, and lets the user dismiss with Escape / backdrop click /
 * focus-outside.
 *
 * The dialog box, backdrop, focus trap, body scroll lock, and return-focus
 * are all owned by `[forDialog]` — this component just bridges the open
 * signal to the Pagefind UI script lifecycle.
 *
 * In dev mode `/_pagefind/` does not exist (Pagefind runs as a postbuild
 * step on `dist/`) — the dialog shows a hint instead.
 */
@Component({
  selector: 'for-docs-search-box',
  imports: [ForDialog, ForDialogBackdrop, ForDialogClose],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="search-trigger"
      [attr.aria-label]="'Open search (Ctrl+K)'"
      (click)="open()"
    >
      <span aria-hidden="true">⌕</span>
      <span class="search-trigger__label">Search</span>
      <kbd>Ctrl K</kbd>
    </button>

    @if (isOpen()) {
      <div
        forDialog
        ariaLabel="Search documentation"
        class="search-dialog"
        (close)="isOpen.set(false)"
      >
        <div forDialogBackdrop class="search-backdrop"></div>
        <button forDialogClose type="button" class="search-close" aria-label="Close search">
          ×
        </button>
        @if (status() === 'unavailable') {
          <p class="search-unavailable">
            Pagefind index is generated as a postbuild step. Run
            <code>pnpm docs:build</code> + <code>pnpm docs:postbuild</code> to
            enable search locally.
          </p>
        }
        <div #mount class="pagefind-mount"></div>
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .search-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.65rem;
      background: var(--for-surface-elevated);
      border: 1px solid var(--for-border);
      border-radius: var(--for-radius-sm);
      color: var(--for-on-surface-muted);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: border-color 120ms ease, color 120ms ease;
    }
    .search-trigger:hover {
      border-color: var(--for-border-strong);
      color: var(--for-on-surface);
    }
    .search-trigger kbd {
      font-family: var(--for-font-mono);
      font-size: 0.7rem;
      padding: 0.05rem 0.35rem;
      background: var(--for-surface-muted);
      border: 1px solid var(--for-border);
      border-radius: 3px;
    }
    @media (max-width: 720px) {
      .search-trigger__label,
      .search-trigger kbd {
        display: none;
      }
    }
    .search-backdrop {
      position: fixed;
      inset: 0;
      background: oklch(0% 0 0 / 50%);
      z-index: 99;
    }
    .search-dialog {
      position: fixed;
      top: 4rem;
      left: 50%;
      transform: translateX(-50%);
      width: min(100% - 2rem, 640px);
      background: var(--for-surface-elevated);
      color: var(--for-on-surface);
      border: 1px solid var(--for-border);
      border-radius: var(--for-radius-lg);
      padding: 1rem 1.25rem 1.25rem;
      box-shadow: 0 30px 60px -20px oklch(0% 0 0 / 35%);
      z-index: 100;
    }
    .search-close {
      position: absolute;
      top: 0.5rem;
      right: 0.6rem;
      background: transparent;
      border: none;
      color: var(--for-on-surface-muted);
      cursor: pointer;
      font-size: 1.5rem;
      line-height: 1;
    }
    .search-close:hover {
      color: var(--for-on-surface);
    }
    .search-unavailable {
      margin: 0.5rem 0 1rem;
      padding: 0.75rem 1rem;
      background: var(--for-surface-muted);
      border-radius: var(--for-radius-md);
      color: var(--for-on-surface-muted);
      font-size: 0.9rem;
    }
    .pagefind-mount {
      min-height: 8rem;
    }
  `,
})
export class SearchBox {
  readonly #doc = inject(DOCUMENT);
  readonly #platformId = inject(PLATFORM_ID);

  protected readonly isOpen = signal(false);
  protected readonly status = signal<'idle' | 'loaded' | 'unavailable'>('idle');
  protected readonly mountEl = viewChild<ElementRef<HTMLElement>>('mount');

  #pagefindUiReady = false;
  #pagefindUiCtor: unknown = null;

  constructor() {
    if (isPlatformBrowser(this.#platformId)) {
      this.#registerHotkey();
    }
    // The dialog mounts the `#mount` div on every open. Re-init Pagefind so
    // the UI lands inside the freshly-mounted host.
    effect(() => {
      if (this.isOpen() && this.status() !== 'unavailable') {
        void this.#initPagefind();
      }
    });
    afterNextRender(() => {
      if (this.isOpen() && this.status() !== 'unavailable') {
        void this.#initPagefind();
      }
    });
  }

  protected open(): void {
    this.isOpen.set(true);
  }

  #registerHotkey(): void {
    const win = this.#doc.defaultView;
    if (!win) return;
    win.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.isOpen.set(true);
      }
      // Escape is handled by the dialog directive.
    });
  }

  async #initPagefind(): Promise<void> {
    if (!isPlatformBrowser(this.#platformId)) return;
    if (this.#pagefindUiReady) {
      this.#mountUi();
      return;
    }
    if (this.status() === 'unavailable') return;

    try {
      const win = this.#doc.defaultView;
      if (!win) throw new Error('no defaultView');
      const probe = await win.fetch('/_pagefind/pagefind-ui.js', { method: 'HEAD' });
      if (!probe.ok) {
        this.status.set('unavailable');
        return;
      }
      await this.#loadScript('/_pagefind/pagefind-ui.js');
      const ctor = (win as unknown as { PagefindUI?: unknown }).PagefindUI;
      if (!ctor) {
        this.status.set('unavailable');
        return;
      }
      this.#pagefindUiCtor = ctor;
      this.#pagefindUiReady = true;
      this.status.set('loaded');
      this.#mountUi();
    } catch {
      this.status.set('unavailable');
    }
  }

  #loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const head = this.#doc.head;
      const existing = head.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset['ready']) return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('script error')), { once: true });
        return;
      }
      const script = this.#doc.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener(
        'load',
        () => {
          script.dataset['ready'] = '1';
          resolve();
        },
        { once: true },
      );
      script.addEventListener('error', () => reject(new Error('script error')), { once: true });
      head.appendChild(script);
    });
  }

  #mountUi(): void {
    const el = this.mountEl()?.nativeElement;
    if (!el || !this.#pagefindUiCtor) return;
    el.innerHTML = '';
    const Ctor = this.#pagefindUiCtor as new (opts: Record<string, unknown>) => unknown;
    new Ctor({
      element: el,
      showSubResults: true,
      resetStyles: false,
    });
  }
}
