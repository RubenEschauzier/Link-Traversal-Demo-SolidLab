import { QueryEngine as QueryEngineLimit2 } from '@rubeneschauzier/query-sparql-link-traversal-solid-limit-depth-2';
import { QueryEngine as QueryEngineLimit3 } from '@rubeneschauzier/query-sparql-link-traversal-solid-limit-depth-3';
import { QueryEngine } from '@comunica/query-sparql-link-traversal-solid';
class LinkTraversalEngine {
    engine;
    engineLimit2;
    engineLimit3;
    constructor() {
        this.engine = new QueryEngine();
        this.engineLimit2 = new QueryEngineLimit2();
        this.engineLimit3 = new QueryEngineLimit3();
    }
    async query(query, context, limit) {
        if (!limit) {
            return await this.engine.queryBindings(query, context);
        }
        if (limit == 2) {
            return await this.engineLimit2.queryBindings(query, context);
        }
        if (limit == 3) {
            return await this.engineLimit3.queryBindings(query, context);
        }
    }
}
const engineInstance = new LinkTraversalEngine();
export const executeTraversalQuery = async (query, context, limit, onUpdate) => {
    console.log("Starting Link Traversal for query:\n", query);
    const queryContext = {
        idp: "void",
        lenient: true,
        noCache: true,
        invalidateCache: true,
        ...context
    };
    return engineInstance.query(query, queryContext, limit);
};
//# sourceMappingURL=queryEngineStub.js.map