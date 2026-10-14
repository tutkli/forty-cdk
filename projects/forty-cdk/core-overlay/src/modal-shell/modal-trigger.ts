import { DestroyRef, ElementRef, inject, Injectable, type Signal } from '@angular/core';

/** The trigger state a modal-shell surface reads to recognise its own trigger. */
export interface ModalTriggerConfig {
  /** The trigger's open state. */
  readonly open: Signal<boolean>;
  /** The id of the surface the trigger controls, or `null` when unset. */
  readonly controls: Signal<string | null>;
}

interface ModalTriggerEntry extends ModalTriggerConfig {
  readonly element: HTMLElement;
}

/**
 * The mounted triggers that toggle a modal-shell surface. A surface counts its own controlling
 * triggers as inside itself for outside-press and outside-focus dismissal, so the press that
 * precedes a trigger's toggling click never closes the surface the click is about to close.
 */
@Injectable({ providedIn: 'root' })
export class ModalTriggerRegistry {
  readonly #entries = new Set<ModalTriggerEntry>();

  /** Adds a trigger and returns the function that removes it. */
  register(entry: ModalTriggerEntry): () => void {
    this.#entries.add(entry);
    return () => this.#entries.delete(entry);
  }

  /**
   * The open triggers controlling `surface`: those whose `controls` names the surface's id, and
   * those with no `controls`, which name no surface and so count as controlling any open one.
   */
  controlling(surface: HTMLElement): HTMLElement[] {
    const out: HTMLElement[] = [];
    for (const entry of this.#entries) {
      if (!entry.open()) {
        continue;
      }
      const controls = entry.controls();
      if (controls === null || (controls !== '' && controls === surface.id)) {
        out.push(entry.element);
      }
    }
    return out;
  }
}

/**
 * Registers the host as a trigger toggling a modal-shell surface, for as long as the host lives.
 * Must be called from an injection context.
 */
export function injectModalTrigger(config: ModalTriggerConfig): void {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const release = inject(ModalTriggerRegistry).register({ ...config, element });
  inject(DestroyRef).onDestroy(release);
}
