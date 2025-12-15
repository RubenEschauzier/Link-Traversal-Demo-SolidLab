import type { BindingsStream } from "@comunica/types";
import { QueryEngine } from '@comunica/query-sparql-link-traversal-solid';

class LinkTraversalEngine {
  public engine: any;
  public constructor(){
    this.engine = new QueryEngine();
  }

  public async query(query: string, context: Record<string, any>){
    const bindingsStream = await this.engine.queryBindings(query, context);
    return bindingsStream

  }
}

const engineInstance = new LinkTraversalEngine();
/**
 * STUB: Link Traversal Query Executor
 * This simulates the asynchronous nature of link traversal.
 * * @param {string} query - The SPARQL query string
 * @param {function} onUpdate - Callback for streaming results (optional)
 * @returns {Promise<Array>} - Resolves with final bindings
 */
export const executeTraversalQuery = async (query: string, context: Record<string,any>, onUpdate?: () => Promise<BindingsStream>) => {
  console.log("Starting Link Traversal for query:\n", query);
  const queryContext = {
    idp: "void",
    lenient: true, 
    noCache: true,
    invalidateCache: true,
    ...context
  }
  return engineInstance.query(query, queryContext);
};