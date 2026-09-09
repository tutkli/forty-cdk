import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'app-switch-disabled-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch],
  template: `
    <div class="row">
      <button forSwitch class="switch" [(checked)]="enabled" disabled>
        <span class="thumb"></span>
      </button>
      <span class="text">Notifications (disabled)</span>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .row {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
    }

    .text {
      font-weight: 500;
    }

    .switch {
      position: relative;
      width: 46px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .switch[data-state='checked'] {
      background: var(--pg-primary);
    }

    .switch[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease;
    }

    .switch[data-state='checked'] .thumb {
      transform: translateX(20px);
    }

    @media (prefers-reduced-motion: reduce) {
      .switch,
      .thumb {
        transition: none;
      }
    }
  `,
})
export class SwitchDisabledExample {
  protected readonly enabled = signal(true);
}
