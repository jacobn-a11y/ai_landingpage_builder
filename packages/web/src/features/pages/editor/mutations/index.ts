/**
 * Mutation engine — re-exports all public APIs.
 */

export type { EditorMutation, MutationTransaction, MutationResult } from './types';
export { applyMutation, applyMutations, generateBlockId, resetIdCounter } from './apply-mutation';
export { validateMutation } from './validate-mutation';
export type { ValidationResult } from './validate-mutation';
export { createTransaction, executeTransaction, resetTxnCounter } from './transaction';
export type { TransactionResult } from './transaction';
export { PatchHistory } from './patch-history';
export type { HistoryEntry } from './patch-history';
