import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterEveryRender,
  computed,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { injectVirtualizer } from 'forty-cdk/virtualization';

const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud'
).split(' ');

interface Message {
  readonly id: number;
  readonly author: string;
  readonly body: string;
}

@Component({
  selector: 'app-virtualization-dynamic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo">
      <div class="toolbar">
        <button type="button" class="jump-btn" (click)="v.scrollToIndex(0, { align: 'start' })">
          Top
        </button>
        <button
          type="button"
          class="jump-btn"
          (click)="v.scrollToIndex(messages.length - 1, { align: 'end' })"
        >
          Bottom
        </button>
      </div>

      <div #scroll class="scroll">
        <div class="track" [style.height.px]="v.totalSize()">
          @for (item of v.virtualItems(); track item.key) {
            <article
              #row
              class="msg"
              [attr.data-index]="item.index"
              [attr.aria-setsize]="messages.length"
              [attr.aria-posinset]="item.index + 1"
              [style.transform]="'translateY(' + item.start + 'px)'"
            >
              <header class="msg-head">
                <span class="msg-author">{{ messages[item.index]!.author }}</span>
                <span class="msg-id">#{{ item.index + 1 }}</span>
              </header>
              <p class="msg-body">{{ messages[item.index]!.body }}</p>
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .demo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: min(460px, 100%);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .jump-btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .jump-btn:hover {
      background: var(--pg-surface-2);
    }

    .jump-btn:active {
      transform: scale(0.95);
    }

    .scroll {
      height: 380px;
      overflow: auto;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      background: var(--pg-surface);
    }

    .track {
      position: relative;
      width: 100%;
    }

    .msg {
      position: absolute;
      left: 0;
      width: 100%;
      padding: 0.7rem 0.95rem;
      border-bottom: 1px solid var(--pg-border);
      box-sizing: border-box;
    }

    .msg-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .msg-author {
      font-size: 0.85rem;
      font-weight: 700;
    }

    .msg-id {
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      color: var(--pg-text-muted);
    }

    .msg-body {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.5;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .jump-btn {
        transition: none;
      }

      .jump-btn:active {
        transform: none;
      }
    }
  `,
})
export class VirtualizationDynamicExample {
  protected readonly messages: readonly Message[] = Array.from({ length: 2000 }, (_, i) => {
    const length = 6 + ((i * 7) % 44);
    const body = Array.from({ length }, (_unused, w) => WORDS[(i + w) % WORDS.length]).join(' ');
    return { id: i, author: `User ${(i % 24) + 1}`, body: `${body}.` };
  });

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);
  private readonly rowEls = viewChildren<ElementRef<HTMLElement>>('row');

  protected readonly v = injectVirtualizer({
    count: signal(this.messages.length),
    estimateSize: () => 64,
    scrollElement: this.scrollElement,
  });

  constructor() {
    afterEveryRender(() => {
      for (const row of this.rowEls()) {
        this.v.measureElement(row.nativeElement);
      }
    });
  }
}
