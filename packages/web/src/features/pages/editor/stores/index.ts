/**
 * Editor stores barrel – re-exports all individual stores.
 */

export {
  createDocumentStore,
  createEmptyBlock,
  type DocumentStore,
  type DocumentStoreApi,
} from './document-store';

export {
  createSelectionStore,
  type SelectionStore,
  type SelectionStoreApi,
} from './selection-store';

export {
  createViewportStore,
  type ViewportStore,
  type ViewportStoreApi,
} from './viewport-store';

export {
  createPersistenceStore,
  type PersistenceStore,
  type PersistenceStoreApi,
} from './persistence-store';

export type { StickyBar, Popup } from './overlay-store';
