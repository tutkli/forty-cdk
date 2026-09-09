import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  isDevMode,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForToastManager } from 'forty-cdk/toast';

import { EXAMPLE_SOURCES } from '../doc/example-source';
import { slugify } from '../../../../../scripts/lib/readme-slug.mjs';
import { GITHUB_BLOB_BASE } from './github';
import { Icon } from './icon';

const DEMOS_SOURCE_PREFIX = 'projects/forty-cdk-docs/src/app/demos/';

@Component({
  selector: 'demo-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  host: { '[id]': 'hostId()', '[class.is-hero]': 'hero()' },
  template: `
    @if (!hero()) {
      <header class="head">
        <h2>{{ title() }}</h2>
        @if (subtitleHtml(); as subtitle) {
          <p class="pg-doc-subtitle" [innerHTML]="subtitle"></p>
        }
      </header>
    }

    <div forTabs class="demo" [value]="tab()" (valueChange)="setTab($event)">
      <div class="demo-bar">
        <div forTabsList class="demo-tablist" aria-label="Example view">
          <button forTabsTrigger value="preview" class="demo-tab" type="button">Preview</button>
          <button forTabsTrigger value="code" class="demo-tab" type="button">Code</button>
        </div>
        <div class="demo-actions">
          @if (tab() === 'code' && highlighted()) {
            <button type="button" class="chip" (click)="copy()" [attr.aria-label]="copyLabel()">
              <app-icon [name]="copied() ? 'check' : 'clipboard'" />
              {{ copied() ? 'Copied' : 'Copy' }}
            </button>
          }
          <a class="chip" [href]="sourceUrl()" target="_blank" rel="noreferrer noopener">
            <app-icon name="github" />
            Source
          </a>
        </div>
      </div>

      <div forTabsContent value="preview" class="demo-panel">
        <section class="preview" aria-label="Preview">
          <ng-content />
        </section>
      </div>

      <div forTabsContent value="code" class="demo-panel">
        @if (highlighted(); as html) {
          <div class="pg-code" [innerHTML]="html"></div>
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
      margin-bottom: 1rem;
    }

    .head h2 {
      margin: 0;
      font-size: 1.3125rem;
      letter-spacing: -0.02em;
    }

    .head p {
      margin: 0.4rem 0 0;
      max-width: 62ch;
      font-size: 0.92rem;
      color: var(--pg-text-muted);
    }

    .demo {
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius);
      corner-shape: squircle;
      overflow: hidden;
    }

    .demo-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.65rem 0.8rem;
      border-bottom: 1px solid var(--pg-border-strong);
    }

    .demo-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-left: auto;
    }

    .chip {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.6rem;
      border: 0;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-border);
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
      color: var(--pg-text-muted);
      text-decoration: none;
      cursor: pointer;
    }

    .chip app-icon {
      width: 15px;
      height: 15px;
    }

    .chip:hover {
      color: var(--pg-text);
    }

    .demo-tablist {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      background: var(--pg-border);
      border-radius: var(--pg-radius-xs);
    }

    .demo-tab {
      appearance: none;
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--pg-text-muted);
      padding: 0.3rem 0.8rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .demo-tab[data-state='active'] {
      background: var(--pg-text);
      color: var(--pg-bg);
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
      padding: 2.1rem 2.5rem 2.4rem;
      background: var(--pg-bg);
    }

    .code-missing {
      margin: 0;
      padding: 1.1rem 1.25rem;
      font-size: 0.9rem;
      color: var(--pg-text-muted);
    }

    @media (max-width: 820px) {
      .head h2 {
        font-size: 1.1rem;
      }

      .demo-tab {
        min-height: 44px;
        padding: 0 1rem;
      }

      .chip {
        min-height: 44px;
        padding: 0 0.8rem;
      }

      .preview {
        min-height: 220px;
        padding: 1rem 0.9rem 1.15rem;
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
  /** Inline HTML, bound as written — a demo subtitle is authored, not compiled. */
  readonly subtitle = input<string>('');
  readonly sourcePath = input.required<string>();
  readonly hero = input(false, { transform: booleanAttribute });

  protected readonly tab = signal<string>('preview');
  protected readonly copied = signal(false);

  readonly tocSlug = computed(() => `example-${slugify(this.title())}`);
  protected readonly hostId = computed(() =>
    this.hero() || !this.title() ? null : this.tocSlug(),
  );

  protected readonly fullSourcePath = computed(() => DEMOS_SOURCE_PREFIX + this.sourcePath());

  protected readonly sourceUrl = computed(() => GITHUB_BLOB_BASE + this.fullSourcePath());

  readonly #source = computed(() => this.#sources?.[this.fullSourcePath()] ?? null);

  protected readonly highlighted = computed<SafeHtml | null>(() => {
    const source = this.#source();
    return source ? this.#sanitizer.bypassSecurityTrustHtml(source.highlighted) : null;
  });

  protected readonly subtitleHtml = computed<SafeHtml | null>(() => {
    const subtitle = this.subtitle();
    return subtitle ? this.#sanitizer.bypassSecurityTrustHtml(subtitle) : null;
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

    if (isDevMode()) {
      effect(() => {
        if (this.#sources && this.#source() === null) {
          console.warn(`[demo-layout] Unresolved example source: ${this.fullSourcePath()}`);
        }
      });
    }
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
