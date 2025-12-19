import { type BindingsStream, Logger } from "@comunica/types";
import { QueryEngine as QueryEngineLimit2 } from '@rubeneschauzier/query-sparql-link-traversal-solid-limit-depth-2';
import { QueryEngine as QueryEngineLimit3 } from '@rubeneschauzier/query-sparql-link-traversal-solid-limit-depth-3';
import { QueryEngine } from '@comunica/query-sparql-link-traversal-solid';

class LinkTraversalEngine {
  public engine: any;
  public engineLimit2: any;
  public engineLimit3: any;

  public constructor(){
    this.engine = new QueryEngine();
    this.engineLimit2 = new QueryEngineLimit2();
    this.engineLimit3 = new QueryEngineLimit3();
  }
  public async query(query: string, context: Record<string, any>, limit: 2 | 3 | undefined){
    if (!limit){
      return await this.engine.queryBindings(query, context);
    }
    if (limit == 2){
      return await this.engineLimit2.queryBindings(query, context);
    }
    if (limit == 3){
      return await this.engineLimit3.queryBindings(query, context);
    }
  }
}


export class ReactTraversalLogger extends Logger {
  private onLogCallback: (log: any) => void;

  constructor(level: string, onLogCallback: (log: any) => void) {
    super();
    this.onLogCallback = onLogCallback;
  }

  // Comunica calls these methods internally
  public trace(message: string, data?: any): void { this.log('trace', message, data); }
  public debug(message: string, data?: any): void { this.log('info', message, data); }
  public info(message: string, data?: any): void { this.log('info', message, data); }
  public warn(message: string, data?: any): void { this.log('warn', message, data); }
  public error(message: string, data?: any): void { this.log('error', message, data); }
  public fatal(message: string, data?: any): void { this.log('fatal', message, data); }
     

  private log(level: 'trace'|'debug'| 'info' | 'warn' | 'error' | 'fatal', message: string, data?: any) {
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

export const executeTraversalQuery = async (query: string, context: Record<string,any>, 
  limit: 2 | 3 | undefined, onUpdate?: () => Promise<BindingsStream>, ) => {
  console.log("Starting Link Traversal for query:\n", query);
  const queryContext = {
    idp: "void",
    lenient: true, 
    noCache: true,
    invalidateCache: true,
    ...context
  }
  return engineInstance.query(query, queryContext, limit);
};

export interface LogEntry {
  id: number;
  message: string;
  timestamp: string;
  level?: 'info' | 'warn' | 'error';
}