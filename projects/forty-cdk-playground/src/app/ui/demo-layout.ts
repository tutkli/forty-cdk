import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForToastManager } from 'forty-cdk/toast';

import { EXAMPLE_SOURCES } from '../doc/example-source';
import { slugify } from '../doc/markdown';
import { GITHUB_BLOB_BASE } from './github';
import { Icon } from './icon';

@Component({
  selector: 'playground-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  host: { '[id]': 'hostId()', '[class.is-hero]': 'hero()' },
  template: `
    @if (!hero()) {
      <header class="head">
        <div class="head-text">
          <h2>{{ title() }}</h2>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>
        <a class="source" [href]="sourceUrl()" target="_blank" rel="noreferrer noopener">
          <app-icon name="github" />
          Source
        </a>
      </header>
    }

    <div forTabs class="demo-tabs" [value]="tab()" (valueChange)="setTab($event)">
      <div forTabsList class="demo-tablist" aria-label="Example view">
        <button forTabsTrigger value="preview" class="demo-tab" type="button">Preview</button>
        <button forTabsTrigger value="code" class="demo-tab" type="button">Code</button>
      </div>

      <div forTabsContent value="preview" class="demo-panel">
        <section class="preview" aria-label="Preview">
          <ng-content />
        </section>
      </div>

      <div forTabsContent value="code" class="demo-panel">
        @if (highlighted(); as html) {
          <div class="code">
            <button type="button" class="copy" (click)="copy()" [attr.aria-label]="copyLabel()">
              <app-icon [name]="copied() ? 'check' : 'clipboard'" />
              {{ copied() ? 'Copied' : 'Copy' }}
            </button>
            <div class="pg-code" [innerHTML]="html"></div>
          </div>
        } @else {
          <p class="code-missing">
            Source unavailable — run <code>pnpm gen:example-sources</code>.
          </p>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      scroll-margin-top: 4.5rem;
    }

    :host(.is-hero) {
      margin-bottom: 2.75rem;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .head h2 {
      margin: 0;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.35rem 0 0;
      max-width: 62ch;
      font-size: 0.92rem;
      color: var(--pg-text-muted);
    }

    .source {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    .source app-icon {
      width: 16px;
      height: 16px;
    }

    .source:hover {
      color: var(--pg-text);
      text-decoration: underline;
    }

    .demo-tablist {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.25rem;
      margin-bottom: 1rem;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .demo-tab {
      appearance: none;
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--pg-text-muted);
      padding: 0.35rem 0.85rem;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .demo-tab[data-state='active'] {
      background: var(--pg-surface);
      color: var(--pg-text);
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
    }

    .demo-tab:focus-visible {
      outline: 2px solid var(--pg-primary);
      outline-offset: 2px;
    }

    .demo-panel[data-state='inactive'] {
      display: none;
    }

    .preview {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      padding: 2rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .code {
      position: relative;
    }

    .copy {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      padding: 0.3rem 0.6rem;
      cursor: pointer;
    }

    .copy app-icon {
      width: 14px;
      height: 14px;
    }

    .copy:hover {
      background: var(--pg-surface-2);
    }

    .code-missing {
      font-size: 0.9rem;
      color: var(--pg-text-muted);
    }

    @media (max-width: 820px) {
      .head {
        flex-direction: column;
        gap: 0.5rem;
      }

      .head h2 {
        font-size: 1.05rem;
      }

      .preview {
        min-height: 220px;
        padding: 1.25rem;
      }
    }
  `,
})
export class DemoLayout {
  readonly #sources = inject(EXAMPLE_SOURCES, { optional: true });
  readonly #toast = inject(ForToastManager);
  readonly #sanitizer = inject(DomSanitizer);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly sourcePath = input.required<string>();
  readonly hero = input(false, { transform: booleanAttribute });

  protected readonly tab = signal<string>('preview');
  protected readonly copied = signal(false);

  readonly tocSlug = computed(() => `example-${slugify(this.title())}`);
  protected readonly hostId = computed(() =>
    this.hero() || !this.title() ? null : this.tocSlug(),
  );

  protected readonly sourceUrl = computed(() => GITHUB_BLOB_BASE + this.sourcePath());

  readonly #source = computed(() => this.#sources?.[this.sourcePath()] ?? null);

  protected readonly highlighted = computed<SafeHtml | null>(() => {
    const source = this.#source();
    return source ? this.#sanitizer.bypassSecurityTrustHtml(source.highlighted) : null;
  });

  protected readonly copyLabel = computed(() =>
    this.copied() ? 'Source copied to clipboard' : 'Copy source to clipboard',
  );

  #resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => {
      if (this.#resetTimer !== null) {
        clearTimeout(this.#resetTimer);
      }
    });
  }

  protected setTab(value: string | null): void {
    this.tab.set(value ?? 'preview');
  }

  protected copy(): void {
    const source = this.#source();
    if (!source) {
      return;
    }
    const clipboard = this.#document.defaultView?.navigator.clipboard;
    if (!clipboard) {
      this.#toast.show({ variant: 'error', title: 'Clipboard unavailable in this browser' });
      return;
    }
    clipboard.writeText(source.code).then(
      () => {
        this.copied.set(true);
        if (this.#resetTimer !== null) {
          clearTimeout(this.#resetTimer);
        }
        this.#resetTimer = setTimeout(() => this.copied.set(false), 2000);
        this.#toast.show({ variant: 'success', title: 'Copied to clipboard', duration: 2000 });
      },
      () => this.#toast.show({ variant: 'error', title: 'Could not copy source' }),
    );
  }
}
