// src/logic/UpdateProcessor.ts
import type { ITopologyUpdate, StatisticTraversalTopology } from "@rubeneschauzier/statistic-traversal-topology";

// Data shapes for our graph
export interface GraphNode { id: string; label: string; shortLabel: string; type: 'root' | 'node' }
export interface GraphEdge { id: string; source: string; target: string }
export interface NodeStatus { id: string; status: 'dereferenced' | 'hub' }

export interface IGraphPayload {
    mode: 'replace' | 'append'; // 'replace' = full snapshot, 'append' = diff
    nodes: GraphNode[];
    edges: GraphEdge[];
    statuses: NodeStatus[];
}

const MAX_NODES = 200; 

export class UpdateProcessor {
    private topologyEmitter: StatisticTraversalTopology;
    
    // --- STATE STORE (The "Memory") ---
    // We keep track of everything we've ever seen
    private knownNodes = new Map<string, GraphNode>();
    private knownEdges = new Map<string, GraphEdge>();

    // For full graph tracking
    private knownNodesFull: Set<string> = new Set();
    private nEdges = 0; 
    private knownStatuses = new Map<string, 'dereferenced' | 'hub'>();

    // Stores {x, y} coordinates so the graph doesn't reset when switching tabs
    public positionCache = new Map<string, { x: number; y: number }>();

    // Viewport Memory (Zoom & Pan)
    public viewportCache: { zoom: number; pan: { x: number; y: number } } | null = null;

    // Clicked nodes memory
    public clickedNodeIds = new Set<string>();
    
    // Debouncing / Batching
    private pendingDiff = this.createEmptyPayload('append');
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly BATCH_MS = 100;

    // Listeners
    private subscribers: Set<(payload: IGraphPayload) => void> = new Set();

    constructor(topologyEmitter: StatisticTraversalTopology) {
        this.topologyEmitter = topologyEmitter;
        this.topologyEmitter.on((data) => this.ingestData(data));
    }

    /**
     * React components call this to receive updates.
     * 1. Returns an unsubscribe function.
     * 2. IMMEDIATELY invokes the callback with the full current history (Hydration).
     */
    public subscribe(callback: (payload: IGraphPayload) => void): () => void {
        this.subscribers.add(callback);

        // 1. HYDRATION: Send everything we know so far as a "replace" event
        const snapshot: IGraphPayload = {
            mode: 'replace',
            nodes: Array.from(this.knownNodes.values()),
            edges: Array.from(this.knownEdges.values()),
            statuses: Array.from(this.knownStatuses.entries()).map(([id, status]) => ({ id, status }))
        };
        
        if (snapshot.nodes.length > 0) {
            callback(snapshot);
        }

        return () => this.subscribers.delete(callback);
    }

    // --- INTERNAL LOGIC ---

    private ingestData(data: ITopologyUpdate) {
        let totalEdges = 0;
        for (const start in data.adjacencyListIn){
            totalEdges += data.adjacencyListIn[start]!.length;
        }
        for (const start in data.adjacencyListOut){
            totalEdges += data.adjacencyListOut[start]!.length;
        }
        this.nEdges = totalEdges;
        this.knownNodesFull = new Set(Array.from(Object.keys(data.nodeToIndexDict)));

        const isTruncated = this.knownNodes.size >= MAX_NODES;
        const dereferencedSet = new Set(data.dereferenceOrder);
        let hasChanges = false;

        // 1. Process Nodes
        if (!isTruncated) {
            Object.entries(data.indexToNodeDict).forEach(([idStr, url]) => {
                if (url.endsWith('.meta')) return;
                const id = parseInt(idStr);

                if (!this.knownNodes.has(idStr)) {
                    const isRoot = !data.adjacencyListIn[id] || data.adjacencyListIn[id].length === 0;
                    if (isRoot){
                        url = "Seed document"
                    }
                    const newNode: GraphNode = {
                        id: idStr,
                        label: url,
                        shortLabel: this.shortenLabel(url),
                        type: isRoot ? 'root' : 'node'
                    };
                    
                    this.knownNodes.set(idStr, newNode);
                    this.pendingDiff.nodes.push(newNode);
                    hasChanges = true;
                }
            });
        }

        // 2. Process Edges
        if (!isTruncated) {
            Object.entries(data.adjacencyListOut).forEach(([sourceStr, targets]) => {
                // Only add edges if we know the source (validity check)
                if (!this.knownNodes.has(sourceStr)) return;

                targets.forEach(targetId => {
                    const targetStr = targetId.toString();
                    if (data.indexToNodeDict[targetId]?.endsWith('.meta')) return;
                    if (!this.knownNodes.has(targetStr)) return;

                    const edgeId = `${sourceStr}->${targetStr}`;
                    if (!this.knownEdges.has(edgeId)) {
                        const newEdge: GraphEdge = { id: edgeId, source: sourceStr, target: targetStr };
                        
                        this.knownEdges.set(edgeId, newEdge);
                        this.pendingDiff.edges.push(newEdge);
                        hasChanges = true;
                    }
                });
            });
        }

        // 3. Process Status
        this.knownNodes.forEach((_, idStr) => {
            const id = parseInt(idStr);
            if (dereferencedSet.has(id)) {
                if (this.knownStatuses.get(idStr) !== 'dereferenced') {
                    this.knownStatuses.set(idStr, 'dereferenced');
                    this.pendingDiff.statuses.push({ id: idStr, status: 'dereferenced' });
                    hasChanges = true;
                }
            }
        });

        if (hasChanges && !this.flushTimer) {
            this.flushTimer = setTimeout(() => this.flush(), this.BATCH_MS);
        }
    }

    private flush() {
        if (this.pendingDiff.nodes.length > 0 || this.pendingDiff.edges.length > 0 || this.pendingDiff.statuses.length > 0) {
            this.notifySubscribers(this.pendingDiff);
        }
        this.pendingDiff = this.createEmptyPayload('append');
        this.flushTimer = null;
    }

    private notifySubscribers(payload: IGraphPayload) {
        this.subscribers.forEach(cb => cb(payload));
    }

    private createEmptyPayload(mode: 'replace' | 'append'): IGraphPayload {
        return { mode, nodes: [], edges: [], statuses: [] };
    }

    private shortenLabel(url: string) {
        try {
            const urlObj = new URL(url);
            let label = urlObj.pathname + urlObj.search + urlObj.hash;
            if (label === '/' || label === '') return urlObj.hostname;
            return decodeURIComponent(label);
        } catch (e) { return url; }
    }

    public getCounts() {
        return {
            nodes: this.knownNodesFull.size,
            edges: this.nEdges,
            uris: [ ...this.knownNodesFull.values()]
        };
    }
}