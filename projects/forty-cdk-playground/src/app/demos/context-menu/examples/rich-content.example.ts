import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import {
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItem,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';

@Component({
  selector: 'app-context-menu-rich-content-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSeparator,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forContextMenu #menu="forContextMenu">
      <div forContextMenuTrigger tabindex="0" class="context-menu-rich-region">
        Right-click anywhere in this area
        <span class="context-menu-rich-hint">(or focus it and press Shift+F10)</span>
      </div>
      @if (menu.open()) {
        <div
          forMenuContent
          class="context-menu-rich context-menu-rich--wide"
          animate.enter="context-menu-rich-pop-in"
        >
          <button forMenuItem class="context-menu-rich-item">Back</button>
          <button forMenuItem class="context-menu-rich-item">Reload</button>

          <hr forMenuSeparator class="context-menu-rich-separator" />

          <button
            forMenuCheckboxItem
            class="context-menu-rich-item context-menu-rich-item--check"
            [(checked)]="showBookmarks"
            (activate)="$event.preventDefault()"
          >
            <span forMenuItemIndicator [forceMount]="true" class="context-menu-rich-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </span>
            Show bookmarks bar
          </button>

          <div forMenuSub #zoom="forMenuSub">
            <button forMenuSubTrigger class="context-menu-rich-item context-menu-rich-item--check">
              <span class="context-menu-rich-indicator"></span>
              Zoom
              <span class="context-menu-rich-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </span>
            </button>
            @if (zoom.open()) {
              <div
                forMenuSubContent
                class="context-menu-rich"
                animate.enter="context-menu-rich-pop-in"
              >
                <button forMenuItem class="context-menu-rich-item">Zoom in</button>
                <button forMenuItem class="context-menu-rich-item">Zoom out</button>
                <button forMenuItem class="context-menu-rich-item">Reset</button>
              </div>
            }
          </div>

          <hr forMenuSeparator class="context-menu-rich-separator" />

          <div forMenuGroup>
            <div forMenuGroupLabel class="context-menu-rich-label">Encoding</div>
            <div forMenuRadioGroup [(value)]="encoding">
              <button
                forMenuRadioItem
                value="utf-8"
                class="context-menu-rich-item context-menu-rich-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="context-menu-rich-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                UTF-8
              </button>
              <button
                forMenuRadioItem
                value="utf-16"
                class="context-menu-rich-item context-menu-rich-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="context-menu-rich-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                UTF-16
              </button>
              <button
                forMenuRadioItem
                value="latin-1"
                class="context-menu-rich-item context-menu-rich-item--check"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="context-menu-rich-indicator">
                  <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                  </svg>
                </span>
                Latin-1
              </button>
            </div>
          </div>

          <hr forMenuSeparator class="context-menu-rich-separator" />

          <button forMenuItem class="context-menu-rich-item context-menu-rich-item--danger">
            Inspect
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    app-context-menu-rich-content-example {
      display: contents;
    }

    .context-menu-rich-region {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: min(420px, 100%);
      min-height: 180px;
      padding: 1.5rem;
      text-align: center;
      font-weight: 600;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      user-select: none;
    }

    .context-menu-rich-hint {
      font-size: 0.8rem;
      font-weight: 400;
    }

    .context-menu-rich {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
      padding: 5px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .context-menu-rich--wide {
      min-width: 232px;
    }

    .context-menu-rich-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.45rem 0.6rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .context-menu-rich-item[data-highlighted],
    .context-menu-rich-item[data-state='open'],
    .context-menu-rich-item:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .context-menu-rich-item[data-disabled] {
      color: var(--pg-text-muted);
      opacity: 0.6;
      cursor: not-allowed;
    }

    .context-menu-rich-item--danger {
      color: var(--pg-danger);
    }

    .context-menu-rich-item--danger[data-highlighted],
    .context-menu-rich-item--danger:not([data-disabled]):hover {
      background: color-mix(in srgb, var(--pg-danger) 14%, transparent);
    }

    .context-menu-rich-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .context-menu-rich-indicator svg {
      width: 1em;
      height: 1em;
    }

    .context-menu-rich-indicator[data-state='unchecked'] {
      opacity: 0;
    }

    .context-menu-rich-arrow {
      display: inline-flex;
      align-items: center;
      margin-left: auto;
      width: 1em;
      height: 1em;
      color: var(--pg-text-muted);
    }

    .context-menu-rich-arrow svg {
      width: 1em;
      height: 1em;
    }

    .context-menu-rich-separator {
      height: 1px;
      margin: 4px -1px;
      border: 0;
      background: var(--pg-border);
    }

    .context-menu-rich-label {
      padding: 0.35rem 0.6rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .context-menu-rich-pop-in {
      transform-origin: var(--for-floating-content-transform-origin, center);
      animation: context-menu-rich-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes context-menu-rich-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .context-menu-rich-pop-in {
        animation-duration: 0.01ms;
      }
    }
  `,
})
export class ContextMenuRichContentExample {
  protected readonly showBookmarks = signal(true);
  protected readonly encoding = signal<string | null>('utf-8');
}
