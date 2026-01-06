import React from 'react';
import { ReactTraversalLogger } from '../api/queryEngineStub.js';
import type { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import type { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
interface ForumProps {
    setDebugQuery: (query: string) => void;
    logger: ReactTraversalLogger | undefined;
    createTracker: () => {
        trackerDiscovery: StatisticLinkDiscovery;
        trackerDereference: StatisticLinkDereference;
    } | null;
    onQueryStart: () => void;
    onQueryEnd: () => void;
    onResultArrived: () => void;
    registerQuery: (stream: any[], setIsLoading: React.Dispatch<React.SetStateAction<boolean>>) => void;
}
export declare const ForumDetail: React.FC<ForumProps>;
export {};
//# sourceMappingURL=ForumDetail.d.ts.map