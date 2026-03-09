/**
 * Transaction creation and execution for batched mutations.
 */

import type { EditorContentJson } from '../types';
import type { EditorMutation, MutationTransaction, MutationResult } from './types';
import { applyMutations } from './apply-mutation';
import { validateMutation } from './validate-mutation';

let _txnCounter = 0;

/**
 * Create a new mutation transaction with a unique ID.
 */
export function createTransaction(
  mutations: EditorMutation[],
  source: MutationTransaction['source'],
  description?: string,
): MutationTransaction {
  _txnCounter += 1;
  const id = `txn_${Date.now()}_${_txnCounter}`;
  return {
    id,
    mutations,
    timestamp: Date.now(),
    source,
    description,
  };
}

/**
 * Reset the transaction counter (useful for testing).
 */
export function resetTxnCounter(): void {
  _txnCounter = 0;
}

export interface TransactionResult {
  content: EditorContentJson;
  results: MutationResult[];
  transaction: MutationTransaction;
}

/**
 * Execute a transaction against the current editor state.
 * Validates all mutations first, then applies them sequentially.
 * If any validation fails, the transaction is not applied at all.
 */
export function executeTransaction(
  state: EditorContentJson,
  transaction: MutationTransaction,
): TransactionResult {
  // Pre-validate all mutations against the initial state.
  // Note: we validate the first mutation against the initial state,
  // and subsequent mutations may depend on prior mutations having been applied.
  // For full accuracy, we validate-then-apply one at a time.
  let current = state;
  const results: MutationResult[] = [];

  for (const mutation of transaction.mutations) {
    const validation = validateMutation(current, mutation);
    if (!validation.valid) {
      results.push({
        success: false,
        error: validation.error,
      });
      return { content: state, results, transaction };
    }

    const applied = applyMutations(current, [mutation]);
    const result = applied.results[0];
    results.push(result);

    if (!result.success) {
      return { content: state, results, transaction };
    }
    current = applied.content;
  }

  return { content: current, results, transaction };
}
