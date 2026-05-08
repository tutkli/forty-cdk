// The defaults trio for the Toast primitive lives historically in
// `toast-manager.ts` because the manager and the defaults token were
// designed together. To keep the file-naming convention enforced by the
// CI guard (CLAUDE.md § "Defaults providers") consistent across all
// primitives, this file re-exports the public defaults surface from the
// manager. Future toast-defaults work should land here.
export {
  FOR_TOAST_DEFAULTS,
  provideForToastDefaults,
  type ForToastDefaults,
} from './toast-manager';
