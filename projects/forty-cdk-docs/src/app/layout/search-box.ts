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
      [attr.aria-label]="'Open search (Ctrl+K)'"
      (click)="open()"
      class="
        inline-flex cursor-pointer items-center gap-2
        rounded-sm border border-border-soft bg-surface-elevated
        px-2.5 py-1.5 text-[0.85rem] font-[inherit] text-on-surface-muted
        transition-colors duration-100
        hover:border-border-strong hover:text-on-surface
      "
    >
      <span aria-hidden="true">⌕</span>
      <span class="max-[720px]:hidden">Search</span>
      <kbd
        class="
          rounded-[3px] border border-border-soft bg-surface-muted
          px-1.5 py-0 font-mono text-[0.7rem]
          max-[720px]:hidden
        "
      >
        Ctrl K
      </kbd>
    </button>

    @if (isOpen()) {
      <div
        forDialog
        ariaLabel="Search documentation"
        (close)="isOpen.set(false)"
        class="
          fixed left-1/2 top-16 z-[100] w-[min(100%-2rem,640px)]
          -translate-x-1/2 rounded-lg border border-border-soft
          bg-surface-elevated px-5 pb-5 pt-4
          text-on-surface shadow-2xl
        "
      >
        <div forDialogBackdrop class="fixed inset-0 z-[99] bg-black/50"></div>
        <button
          forDialogClose
          type="button"
          aria-label="Close search"
          class="
            absolute right-2.5 top-2 cursor-pointer border-0 bg-transparent
            text-2xl leading-none text-on-surface-muted
            hover:text-on-surface
          "
        >
          ×
        </button>
        @if (status() === 'unavailable') {
          <p
            class="
              my-2 mb-4 rounded-md bg-surface-muted px-4 py-3
              text-[0.9rem] text-on-surface-muted
            "
          >
            Pagefind index is generated as a postbuild step. Run
            <code>pnpm docs:build</code> + <code>pnpm docs:postbuild</code> to enable search
            locally.
          </p>
        }
        <div #mount class="min-h-32"></div>
      </div>
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
