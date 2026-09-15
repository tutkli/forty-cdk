import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

@Component({
  selector: 'app-switch-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSwitch],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <button forSwitch class="switch" [(checked)]="enabled">
          <span class="thumb"></span>
        </button>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <button forSwitch class="switch" [(checked)]="enabled" disabled>
          <span class="thumb"></span>
        </button>
      </div>

      <div class="state">
        <span class="state-label">Read-only</span>
        <button forSwitch class="switch" [(checked)]="enabled" readonly>
          <span class="thumb"></span>
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.8rem;
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
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

    .switch[data-readonly] {
      cursor: default;
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
export class SwitchStatesExample {
  protected readonly enabled = signal(true);
}
