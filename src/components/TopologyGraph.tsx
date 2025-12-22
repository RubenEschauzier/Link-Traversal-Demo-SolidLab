import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { UpdateProcessor, IGraphPayload } from '../api/UpdateProcessor.js';

interface GraphProps {
  processor: UpdateProcessor | null; // Pass the instance directly
}

const TopologyGraph: React.FC<GraphProps> = ({ processor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // 1. Initialize Cytoscape (Empty)
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      minZoom: 0.1,
      maxZoom: 3,
      textureOnViewport: true,
      hideEdgesOnViewport: true,
      pixelRatio: 1,
      style: [
        { selector: 'node', style: { 'background-color': '#64748b', 'label': 'data(shortLabel)', 'width': 20, 'height': 20, 'text-opacity': 0 } },
        { selector: '.root', style: { 'background-color': '#f59e0b', 'width': 40, 'height': 40, 'text-opacity': 1 } },
        { selector: '.dereferenced', style: { 'background-color': '#10b981' } },
        { selector: '.hovered', style: { 'text-opacity': 1, 'z-index': 9999, 'text-background-color': '#fff', 'text-background-opacity': 0.8 } },
        { selector: 'edge', style: { 'width': 2, 'line-color': '#94a3b8', 'curve-style': 'straight', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#64748b' } }
      ],
      layout: { name: 'grid' }
    });

    cy.on('mouseover', 'node', e => e.target.addClass('hovered'));
    cy.on('mouseout', 'node', e => e.target.removeClass('hovered'));

    cyRef.current = cy;
    return () => cy.destroy();
  }, []);

  // 2. Subscribe to Data Stream
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !processor) return;

    // This callback runs IMMEDIATELY with full history upon subscription,
    // and then subsequently with small diffs.
    const unsubscribe = processor.subscribe((payload: IGraphPayload) => {
      cy.batch(() => {
        
        // A. Hydration (Replace everything)
        // This handles the "Tab Switch" case
        if (payload.mode === 'replace') {
          cy.elements().remove(); // Clear canvas
        }

        // B. Add Nodes
        if (payload.nodes.length > 0) {
          cy.add(payload.nodes.map(n => ({
            group: 'nodes',
            data: { id: n.id, label: n.label, shortLabel: n.shortLabel },
            classes: n.type,
            position: getDeterministicPosition(n.id)
          })));
        }

        // C. Add Edges
        if (payload.edges.length > 0) {
           const edgesToAdd = payload.edges
             .filter(e => payload.mode === 'replace' || cy.getElementById(e.id).empty())
             .map(e => ({
                group: 'edges' as const, // <--- ADD 'as const' HERE
                data: { id: e.id, source: e.source, target: e.target }
             }));
           cy.add(edgesToAdd);
        }

        // D. Update Status
        payload.statuses.forEach(s => {
          const node = cy.getElementById(s.id);
          if (node.nonempty()) node.addClass(s.status);
        });
      });

      // E. Layout Logic
      // Only run layout if we actually added structural elements
      if (payload.nodes.length > 0) {
        // If it's a small update (append), lock old nodes to prevent jumping
        if (payload.mode === 'append') {
           // Lock everything EXCEPT the new nodes we just added
           // Note: This is a simplification. For best results, lock nodes before adding new ones.
           // But since 'fcose' supports constraints, locking is the easiest way.
           const newIds = new Set(payload.nodes.map(n => n.id));
           cy.nodes().filter(n => !newIds.has(n.id())).lock();
        }

        const layout = cy.layout({
          name: 'cose',
          animate: false, 
          
          nodeRepulsion: 100000,   
          idealEdgeLength: 300,    
          gravity: 0.1,            
          nodeOverlap: 50,
          componentSpacing: 100,   
          nestingFactor: 1.2,
          initialTemp: 1000,
          coolingFactor: 0.99,
          minTemp: 1.0,
          padding: 100, 

          fit: true, // Only reset zoom on full load
          randomize: false,
          numIter: 1000
        } as any);

        layout.run();
        
        // Unlock after layout if you want them draggable
        // cy.nodes().unlock();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [processor]); // Re-subscribe if processor instance changes

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

// Deterministic position generator (Acts like a seed)
const getDeterministicPosition = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Spread nodes comfortably across a 1000x1000 grid
  return {
    x: (hash % 1000), 
    y: ((hash * 31) % 1000) 
  };
};

export default TopologyGraph;