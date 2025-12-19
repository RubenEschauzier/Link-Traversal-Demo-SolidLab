import { Logger } from "@comunica/types";
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
export class ReactTraversalLogger extends Logger {
    onLogCallback;
    constructor(level, onLogCallback) {
        super();
        this.onLogCallback = onLogCallback;
    }
    // Comunica calls these methods internally
    trace(message, data) { this.log('trace', message, data); }
    debug(message, data) { this.log('info', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    fatal(message, data) { this.log('fatal', message, data); }
    log(level, message, data) {
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        this.onLogCallback({
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            message: data ? `${message} ${JSON.stringify(data)}` : message,
            level
        });
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