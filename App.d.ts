import React from 'react';
export interface QueryMetrics {
    /**
     * Performance.now value of start time query
     */
    startTime: number;
    endTime: number;
    resultCount: number;
    /** * Relative arrival times since beginning query
     */
    arrivalTimes: number[];
    /**
     * If the query is still running
     */
    isQueryRunning: boolean;
}
declare const App: React.FC;
export default App;
//# sourceMappingURL=App.d.ts.map