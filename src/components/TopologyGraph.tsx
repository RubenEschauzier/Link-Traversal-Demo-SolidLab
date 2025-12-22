import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

// --- Configuration ---
const HUB_THRESHOLD = 8; // Nodes with >= 3 children will always show their label

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
  update: boolean;
}

// --- Helper: URL Shortener ---
const shortenLabel = (url: string) => {
  try {
    const urlObj = new URL(url);
    let label = urlObj.pathname + urlObj.search + urlObj.hash;
    if (label === '/' || label === '') return urlObj.hostname;
    // Decode URI components for readability (e.g. %20 -> space)
    return decodeURIComponent(label);
  } catch (e) {
    return url;
  }
};

const TopologyGraph: React.FC<GraphProps> = ({ data, update }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutHasRun = useRef(false);
  const layoutFinalizedTruncated = useRef(false);

  // 1. Initialize Cytoscape (Runs Once)
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      minZoom: 0.05,
      maxZoom: 3,
      // --- PERFORMANCE SETTINGS ---
      textureOnViewport: true,  // Renders a low-res "texture" while zooming/panning (HUGE speedup)
      hideEdgesOnViewport: true, // Hides edges while dragging (optional, but very fast)
      pixelRatio: 1, // Caps rendering at 1x density. Critical for high-DPI screens.
      motionBlur: true, // Adds motion blur effect that can mask low framerate (optional)
      
      style: [
        // --- BASE NODE (Labels Hidden by Default) ---
        {
          selector: 'node',
          style: {
            'background-color': '#64748b',
            'label': 'data(shortLabel)',
            'font-family': 'sans-serif',
            'font-size': '12px',
            'color': '#1e293b', 
            
            // Text Placement
            'text-valign': 'center',
            'text-halign': 'right',
            'text-margin-x': 8,

            // HIDE LABEL BY DEFAULT
            'text-opacity': 0, 

            // Visuals
            'width': 20,
            'height': 20,
            'border-width': 1,
            'border-color': '#fff'
          }
        },
        // --- HUB NODE (Always Show Label) ---
        {
           selector: '.hub',
           style: {
             'text-opacity': 1,
             'font-weight': 'bold',
             'font-size': '13px',
             'z-index': 10
           }
        },
        // --- HOVER STATE (Show Label Interaction) ---
        {
          selector: '.hovered',
          style: {
            'text-opacity': 1,
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.9,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'z-index': 9999
          }
        },
        // --- STATUS COLORS ---
        {
          selector: '.dereferenced',
          style: { 'background-color': '#10b981' } // Green
        },
        {
          selector: '.root',
          style: {
            'background-color': '#f59e0b', // Orange
            'width': 40,
            'height': 40,
            'border-width': 3,
            'text-opacity': 1 // Roots always show label
          }
        },
        {
          selector: '.active',
          style: {
            'background-color': '#3b82f6', // Blue Pulse
            'width': 30,
            'height': 30,
            'border-width': 3,
            'border-color': '#93c5fd'
          }
        },
        // --- EDGES ---
        {
          selector: 'edge',
          style: {
            'width': 2,               // Slightly thicker line
            'line-color': '#94a3b8',  // Darker Slate Gray (was #cbd5e1)
            'curve-style': 'straight', // Performance: straight is faster than bezier
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748b', // Match the darker line
            'arrow-scale': .8,       // Much larger arrowhead (was 0.8)
            'opacity': 0.8            // Less transparent (was 0.5)
          }
        }
      ],
      layout: { name: 'grid' }
    });

    // --- EVENT LISTENERS FOR HOVER ---
    cy.on('mouseover', 'node', (e) => {
      const node = e.target;
      node.addClass('hovered');
    });

    cy.on('mouseout', 'node', (e) => {
      const node = e.target;
      node.removeClass('hovered');
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      layoutHasRun.current = false;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;
    
    // Safety check for empty data
    if (Object.keys(data.indexToNodeDict).length === 0) return;

    // When the graph has been truncated and fully finalized, stop updates
    if (layoutFinalizedTruncated.current === true && update){
      runSpaciousLayout(cy, false);
      layoutHasRun.current = true;
      return;
    }
    
    const truncationLimit = 100;
    const maxFrontierNodes = 50;
    let frontierFull = false;

    cy.batch(() => {
      const isTruncating = data.dereferenceOrder.length > truncationLimit;
      
      const safeNodesArray = isTruncating 
          ? data.dereferenceOrder.slice(0, truncationLimit) 
          : data.dereferenceOrder;
          
      const safeSet = new Set(safeNodesArray);
      const fullDereferencedSet = new Set(data.dereferenceOrder);

      // 2. Create Graph based on logic
      const { fullyDereferenced, full } = createTruncatedGraph(
        data, 
        safeSet, 
        fullDereferencedSet, 
        maxFrontierNodes, 
        cy
      );
      console.log(`Full from graph: ${full}`);
      frontierFull = full;

      // If we are truncating and hit the frontier limit, lock existing nodes
      // to prevents layout jitter as new frontier nodes might pop in/out
      if (isTruncating && frontierFull) {
        const preExistingNodes = cy.nodes();
        preExistingNodes.lock();
      }
      
      layoutFinalizedTruncated.current = fullyDereferenced;

      // --- PHASE 3: Deduplication / Merging ---
      const seenLabels = new Map<string, string>(); // shortLabel -> keeperNodeId
      const nodesToRemove = cy.collection();

      cy.nodes().forEach((node) => {
        if (nodesToRemove.has(node)) return;

        const shortLabel = node.data('shortLabel');
        if (!shortLabel) return;

        if (seenLabels.has(shortLabel)) {
          const keeperId = seenLabels.get(shortLabel)!;
          
          // 1. Rewire Edges to the Keeper
          node.connectedEdges().forEach((edge) => {
            const isSource = edge.source().id() === node.id();
            const otherSideId = isSource ? edge.target().id() : edge.source().id();

            // Prevent self-loops
            if (otherSideId === keeperId) return;

            if (isSource) {
              const newEdgeId = `${keeperId}->${otherSideId}`;
              if (cy.getElementById(newEdgeId).empty()) {
                 cy.add({ group: 'edges', data: { id: newEdgeId, source: keeperId, target: otherSideId } });
              }
            } else {
              const newEdgeId = `${otherSideId}->${keeperId}`;
              if (cy.getElementById(newEdgeId).empty()) {
                 cy.add({ group: 'edges', data: { id: newEdgeId, source: otherSideId, target: keeperId } });
              }
            }
          });

          nodesToRemove.merge(node);
          
        } else {
          seenLabels.set(shortLabel, node.id());
        }
      });
      cy.remove(nodesToRemove);
    });

    if (data.updateType === 'discover' || !layoutHasRun.current) {
      runSpaciousLayout(cy, true);
      layoutHasRun.current = true;
      // When all nodes that will be rendered exist, just lock them
      // but still allow updates to node states
      console.log(`frontier full: ${frontierFull}`);
      if (frontierFull){
        const existingNodes = cy.nodes();
        existingNodes.lock();
      }
    }
  }, [data]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', background: '#f8fafc' }} 
    />
  );
};

function createTruncatedGraph(
  data: ITopologyUpdate,
  safeSet: Set<number>,        // Fully processed nodes within limit
  fullDereferencedSet: Set<number>, // All dereferenced nodes (for styling)
  maxFrontier: number,         // Max number of un-dereferenced children to show
  cy: cytoscape.Core
){
  const nodesRendered: Set<number> = new Set();
  const rootNodes: Set<number> = new Set();
  let frontierCount = 0;

  // 1. Iterate over ALL known nodes to decide what to render
  Object.entries(data.indexToNodeDict).forEach(([idStr, url]) => {
    if (url.endsWith('.meta')) return;
    const id = parseInt(idStr);
    
    const parents = data.adjacencyListIn[id];
    const isRoot = !parents || parents.length === 0;

    let shouldRender = false;

    if (safeSet.has(id)) {
        // Case A: Safe Node (In the truncated list)
        shouldRender = true;
    } else if (isRoot) {
        // Case B: Root Node (Always show)
        shouldRender = true;
    } else {
        // Case C: Frontier Node (Child of a Safe Node)
        // Only show if we haven't hit the frontier limit
        const hasSafeParent = parents?.some(p => safeSet.has(p));
        if (hasSafeParent) {
            if (frontierCount < maxFrontier) {
                shouldRender = true;
                frontierCount++;
            }
        }
    }

    if (!shouldRender) return;

    // --- RENDER ---
    nodesRendered.add(id);
    if (isRoot) rootNodes.add(id);

    const existing = cy.getElementById(idStr);
    const children = data.adjacencyListOut[id];

    // Status Styling
    // A node is only "green" (dereferenced) if it is in the FULL set
    const isDereferenced = fullDereferencedSet.has(id); 
    const isHub = children && children.length >= HUB_THRESHOLD;

    const classes = [
      isDereferenced ? 'dereferenced' : '',
      isRoot ? 'root' : '',
      isHub ? 'hub' : '' 
    ].filter(Boolean).join(' ');

    if (existing.nonempty()) {
      if (existing.classes().join(' ') !== classes) {
        existing.classes(classes);
      }
    } else {
      cy.add({
        group: 'nodes',
        data: { 
          id: idStr, 
          label: url,
          shortLabel: shortenLabel(url)
        },
        classes: classes,
        position: getInitialPosition(cy, data.parentNode)
      });
    }
  });

  // 2. Add Edges (Only where both source and target are rendered)
  Object.entries(data.adjacencyListOut).forEach(([sourceStr, targets]) => {  
    const sourceId = parseInt(sourceStr);
    if (!nodesRendered.has(sourceId)) return;

    targets.forEach(targetId => {
      if (data.indexToNodeDict[targetId]?.endsWith('.meta')) return;
      if (!nodesRendered.has(targetId)) return;
      
      const edgeId = `${sourceStr}->${targetId}`;
      if (cy.getElementById(edgeId).empty()) {
        cy.add({
          group: 'edges',
          data: {
            id: edgeId,
            source: sourceStr,
            target: targetId.toString()
          }
        });
      }
    });
  });

  // 3. Check completion status
  // We are "fully dereferenced" if every rendered node (except roots) has been processed
  const fullyDereferenced = [...nodesRendered].every(id => 
    fullDereferencedSet.has(id) || rootNodes.has(id)
  );

  const full = frontierCount >= maxFrontier;

  return { fullyDereferenced, full };
}

// Update the layout function to accept a 'shouldFit' parameter
const runSpaciousLayout = (cy: cytoscape.Core, shouldFit: boolean) => {
  cy.layout({
    name: 'cose',
    animate: false, 
    
    nodeRepulsion: 100000,   
    idealEdgeLength: 300,    
    gravity: 0.1,            
    nodeOverlap: 50,
    componentSpacing: 100,   
    nestingFactor: 1.2,
    numIter: 500,
    initialTemp: 1000,
    coolingFactor: 0.99,
    minTemp: 1.0,
    padding: 100, 
    
    // THE FIX: Only fit on the first run, otherwise maintain user's zoom
    fit: shouldFit, 
    
    randomize: false 
  } as any).run();
};

const getInitialPosition = (cy: cytoscape.Core, parentId: number) => {
  const parent = cy.getElementById(parentId.toString());
  if (parent.nonempty()) {
    const pos = parent.position();
    const angle = Math.random() * 2 * Math.PI;
    const radius = 50; 
    return { 
      x: pos.x + radius * Math.cos(angle), 
      y: pos.y + radius * Math.sin(angle) 
    };
  }
  return { x: 0, y: 0 };
};

export default TopologyGraph;