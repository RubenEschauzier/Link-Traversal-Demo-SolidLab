import React from 'react';
export interface ITopologyUpdate {
    updateType: 'discover' | 'dereference';
    adjacencyListIn: Record<number, number[]>;
    adjacencyListOut: Record<number, number[]>;
    edgesInOrder: number[][];
    openNodes: number[];
    dereferenceOrder: number[];
    nodeToIndexDict: Record<string, number>;
    indexToNodeDict: Record<number, string>;
    childNode: number;
    parentNode: number;
}
interface GraphProps {
    data: ITopologyUpdate | null;
}
declare const TopologyGraph: React.FC<GraphProps>;
export default TopologyGraph;
//# sourceMappingURL=TopologyGraph.d.ts.map