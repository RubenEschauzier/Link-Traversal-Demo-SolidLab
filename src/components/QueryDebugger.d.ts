import React from 'react';
interface LogEntry {
    id: number;
    message: string;
    timestamp: string;
    level?: 'info' | 'warn' | 'error';
}
interface QueryDebuggerProps {
    /** Flag to control the visibility of the modal. */
    isOpen: boolean;
    /** Callback function to close the modal. */
    onClose: () => void;
    /** The current SPARQL query string being executed. */
    currentQuery: string;
    /** Array of log entries to display in the log window. */
    logs: LogEntry[];
}
declare const QueryDebugger: React.FC<QueryDebuggerProps>;
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.d.ts.map