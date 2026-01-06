import React from 'react';
import { ReactTraversalLogger } from '../api/queryEngineStub.js';
import '../index.css';
import type { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import type { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
interface ProfileProps {
    setDebugQuery: (query: string) => void;
    logger: ReactTraversalLogger | undefined;
    createTracker: () => {
        trackerDiscovery: StatisticLinkDiscovery;
        trackerDereference: StatisticLinkDereference;
    } | null;
    onQueryStart: () => void;
    onQueryEnd: () => void;
    onResultArrived: () => void;
    registerQuery: (stream: any[], setIsLoading: any) => void;
}
export declare const Profile: React.FC<ProfileProps>;
export {};
//# sourceMappingURL=MyProfile.d.ts.map