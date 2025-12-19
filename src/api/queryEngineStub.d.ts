import { type BindingsStream, Logger } from "@comunica/types";
export declare class ReactTraversalLogger extends Logger {
    private onLogCallback;
    constructor(level: string, onLogCallback: (log: any) => void);
    trace(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    fatal(message: string, data?: any): void;
    private log;
}
export declare const executeTraversalQuery: (query: string, context: Record<string, any>, limit: 2 | 3 | undefined, onUpdate?: () => Promise<BindingsStream>) => Promise<any>;
export interface LogEntry {
    id: number;
    message: string;
    timestamp: string;
    level?: 'info' | 'warn' | 'error';
}
//# sourceMappingURL=queryEngineStub.d.ts.map