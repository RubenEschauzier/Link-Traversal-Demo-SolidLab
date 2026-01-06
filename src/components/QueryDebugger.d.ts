import React from 'react';
import type { UpdateProcessor } from '../api/UpdateProcessor.js';
import type { QueryMetrics } from '../../App.js';
interface TopologyData {
    totalSources: number;
    totalRequests: number;
    activeRequests: number;
    visitedUris: string[];
    [key: string]: any;
}
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
    topology: TopologyData | null;
    processor: UpdateProcessor | null;
    isTrackingEnabled?: boolean;
    metrics: QueryMetrics;
    isQueryRunning?: boolean;
}
declare const QueryDebugger: React.FC<QueryDebuggerProps>;
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.d.ts.map