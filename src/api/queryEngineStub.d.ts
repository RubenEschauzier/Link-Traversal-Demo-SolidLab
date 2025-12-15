import type { BindingsStream } from "@comunica/types";
/**
 * STUB: Link Traversal Query Executor
 * This simulates the asynchronous nature of link traversal.
 * * @param {string} query - The SPARQL query string
 * @param {function} onUpdate - Callback for streaming results (optional)
 * @returns {Promise<Array>} - Resolves with final bindings
 */
export declare const executeTraversalQuery: (query: string, context: Record<string, any>, onUpdate?: () => Promise<BindingsStream>) => Promise<any>;
//# sourceMappingURL=queryEngineStub.d.ts.map