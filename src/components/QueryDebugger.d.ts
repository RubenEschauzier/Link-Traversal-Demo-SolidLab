import React from 'react';
interface LogEntry {
    id: number;
    message: string;
    timestamp: string;
    level?: 'info' | 'warn' | 'error';
}
interface QueryDebuggerProps {
    isOpen: boolean;
    onClose: () => void;
    currentQuery: string;
    logs: LogEntry[];
    isTrackingEnabled?: boolean;
}
declare const QueryDebugger: React.FC<QueryDebuggerProps>;
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.d.ts.map