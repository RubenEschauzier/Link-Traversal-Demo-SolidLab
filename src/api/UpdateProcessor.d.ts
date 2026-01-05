import type { StatisticTraversalTopology } from "@rubeneschauzier/statistic-traversal-topology";
export interface GraphNode {
    id: string;
    label: string;
    shortLabel: string;
    type: 'root' | 'node';
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
}
export interface NodeStatus {
    id: string;
    status: 'dereferenced' | 'hub';
}
export interface IGraphPayload {
    mode: 'replace' | 'append';
    nodes: GraphNode[];
    edges: GraphEdge[];
    statuses: NodeStatus[];
}
export declare class UpdateProcessor {
    private topologyEmitter;
    private knownNodes;
    private knownEdges;
    private knownNodesFull;
    private nEdges;
    private knownStatuses;
    positionCache: Map<string, {
        x: number;
        y: number;
    }>;
    viewportCache: {
        zoom: number;
        pan: {
            x: number;
            y: number;
        };
    } | null;
    clickedNodeIds: Set<string>;
    private pendingDiff;
    private flushTimer;
    private readonly BATCH_MS;
    private subscribers;
    constructor(topologyEmitter: StatisticTraversalTopology);
    /**
     * React components call this to receive updates.
     * 1. Returns an unsubscribe function.
     * 2. IMMEDIATELY invokes the callback with the full current history (Hydration).
     */
    subscribe(callback: (payload: IGraphPayload) => void): () => void;
    private ingestData;
    private flush;
    private notifySubscribers;
    private createEmptyPayload;
    private shortenLabel;
    getCounts(): {
        nodes: number;
        edges: number;
    };
}
//# sourceMappingURL=UpdateProcessor.d.ts.map