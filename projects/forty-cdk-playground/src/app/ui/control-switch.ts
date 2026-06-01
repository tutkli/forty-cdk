import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ForSwitch } from 'forty-cdk';

import { InfoTip } from './info-tip';

@Component({
  selector: 'app-control-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch, InfoTip],
  template: `
    <div class="switch-row">
      @if (hint(); as hint) {
        <app-info-tip [text]="hint" />
      }
      <button forSwitch class="switch" [(checked)]="checked" [disabled]="disabled()">
        <span class="text">{{ label() }}</span>
        <span class="track"><span class="thumb"></span></span>
      </button>
    </div>
  `,
  styles: `
    .switch-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .switch {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex: 1;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--pg-text);
      text-align: left;
      cursor: pointer;
    }

    .switch[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .text {
      flex: 1;
    }

    .track {
      flex: none;
      position: relative;
      width: 38px;
      height: 22px;
      border-radius: 999px;
      background: var(--pg-border-strong);
      transition: background 0.2s ease;
    }

    .switch[data-state='checked'] .track {
      background: var(--pg-primary);
    }

    .thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease;
    }

    .switch[data-state='checked'] .thumb {
      transform: translateX(16px);
    }

    @media (prefers-reduced-motion: reduce) {
      .track,
      .thumb {
        transition: none;
      }
    }
  `,
})
export class ControlSwitch {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly checked = model.required<boolean>();
  readonly disabled = input(false);
}
