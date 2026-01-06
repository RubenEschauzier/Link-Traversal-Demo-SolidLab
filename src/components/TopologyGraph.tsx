import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { UpdateProcessor, IGraphPayload } from '../api/UpdateProcessor.js';

interface GraphProps {
  processor: UpdateProcessor | null;
}

const TopologyGraph: React.FC<GraphProps> = ({ processor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const finalLayoutTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !processor) return;

    // 1. INITIALIZE WITH SAVED VIEWPORT
    // We check the public property directly.
    const savedViewport = processor.viewportCache || { zoom: 1, pan: { x: 0, y: 0 } };

    const cy = cytoscape({
      container: containerRef.current,
      // Restore camera immediately
      zoom: savedViewport.zoom,
      pan: savedViewport.pan,
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
        
        // The "Clicked" style
        { selector: '.clicked', style: { 
            'text-opacity': 1, 
            'z-index': 9999, 
            'text-background-color': '#fff', 
            'text-background-opacity': 0.8, 
            'border-width': 2, 
            'border-color': '#333', 
            'width': 30, 
            'height': 30, 
            'font-size': '24px', 
            'font-weight': 'bold' 
        }}, 
        
        { selector: 'edge', style: { 'width': 2, 'line-color': '#94a3b8', 'curve-style': 'straight', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#64748b' } }
      ],
      layout: { name: 'preset' } 
    });

    // 2. SETUP INTERACTIONS
    cy.on('mouseover', 'node', e => e.target.addClass('hovered'));
    cy.on('mouseout', 'node', e => e.target.removeClass('hovered'));
    cy.on('tap', 'node', e => e.target.toggleClass('clicked'));
    
    // Clear selection on background click
    cy.on('tap', e => { 
        if (e.target === cy) cy.nodes().removeClass('clicked'); 
    });

    cyRef.current = cy;

    // 3. SUBSCRIBE TO UPDATES
    const unsubscribe = processor.subscribe((payload: IGraphPayload) => {
      let allNodesHadCache = true; 

      cy.batch(() => {
        if (payload.mode === 'replace') cy.elements().remove();
        
        // Add Nodes
        if (payload.nodes.length > 0) {
          cy.add(payload.nodes.map(n => {
            // A. Check Position Cache
            const cachedPos = processor.positionCache.get(n.id);
            if (!cachedPos) allNodesHadCache = false;

            // B. Check Clicked Cache (Restore pinned labels)
            // We check the Set directly
            const isClicked = processor.clickedNodeIds.has(n.id);
            const classes = isClicked ? `${n.type} clicked` : n.type;

            return {
              group: 'nodes',
              data: { id: n.id, label: n.label, shortLabel: n.shortLabel },
              classes: classes, // Apply the class immediately
              position: cachedPos || getDeterministicPosition(n.id)
            };
          }));
        }

        // Add Edges
        if (payload.edges.length > 0) {
           const edgesToAdd = payload.edges
             .filter(e => payload.mode === 'replace' || cy.getElementById(e.id).empty())
             .map(e => ({
                group: 'edges' as const,
                data: { id: e.id, source: e.source, target: e.target }
             }));
           cy.add(edgesToAdd);
        }
        
        // Update Statuses
        payload.statuses.forEach(s => {
          const node = cy.getElementById(s.id);
          if (node.nonempty()) node.addClass(s.status);
        });
      });

      // 4. LAYOUT LOGIC
      
      // If we are restoring a full graph from cache, do NOT run layout.
      // This prevents the graph from "jumping" when you switch tabs.
      if (payload.nodes.length > 0 && allNodesHadCache) {
         return; 
      }

      // Incremental Layout (Show progress)
      if (payload.nodes.length > 0) {
        if (payload.mode === 'append') {
           const newIds = new Set(payload.nodes.map(n => n.id));
           cy.nodes().filter(n => !newIds.has(n.id())).lock();
        }
        cy.layout({
          name: 'cose', animate: false, nodeRepulsion: 100000, idealEdgeLength: 300,    
          gravity: 0.1, initialTemp: 1000, fit: true, randomize: false
        } as any).run();
      }

      // Final Layout (Debounced snap)
      if (finalLayoutTimer.current) clearTimeout(finalLayoutTimer.current);

      finalLayoutTimer.current = window.setTimeout(() => {
        if (cy.destroyed()) return;
        cy.nodes().unlock();
        cy.layout({
          name: 'cose', animate: false, randomize: false, initialTemp: 200,      
          nodeRepulsion: 100000, idealEdgeLength: 300, gravity: 0.1, fit: true, numIter: 1000
        } as any).run();
      }, 1000); 
    });

    // 5. CLEANUP (SAVE STATE ON UNMOUNT)
    return () => {
      // Save everything to the processor before destroying
      if (processor && cy && !cy.destroyed()) {
        
        // A. Save Positions
        cy.nodes().forEach((node: any) => {
            processor.positionCache.set(node.id(), node.position());
        });

        // B. Save Viewport
        processor.viewportCache = { zoom: cy.zoom(), pan: cy.pan() };

        // C. Save Clicked Nodes
        // Create a new Set from the current selection
        processor.clickedNodeIds = new Set(cy.nodes('.clicked').map(n => n.id()));
      }

      unsubscribe();
      cy.destroy();
      if (finalLayoutTimer.current) clearTimeout(finalLayoutTimer.current);
    };
  }, [processor]);

  return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        
        {/* 1. The Cytoscape Canvas */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* 2. The Legend Overlay */}
        <div style={legendStyles.container}>
          <h4 style={legendStyles.header}>Legend</h4>
          
          <div style={legendStyles.item}>
            <span style={{ ...legendStyles.colorBox, backgroundColor: '#f59e0b' }}></span>
            <span>Seed document</span>
          </div>

          <div style={legendStyles.item}>
            <span style={{ ...legendStyles.colorBox, backgroundColor: '#10b981' }}></span>
            <span>Dereferenced Document</span>
          </div>

          <div style={legendStyles.item}>
            <span style={{ ...legendStyles.colorBox, backgroundColor: '#64748b' }}></span>
            <span>Discovered Document</span>
          </div>

        </div>

      </div>
    );
  };

const getDeterministicPosition = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return { x: (hash % 1000), y: ((hash * 31) % 1000) };
};

const legendStyles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    bottom: '20px',
    left: '20px', // or right: '20px'
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#334155',
    pointerEvents: 'none', // Allows clicking through the legend if needed (optional)
  },
  header: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  colorBox: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    marginRight: '8px',
    display: 'inline-block',
  }
};

export default TopologyGraph;