import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

// --- Configuration ---
const HUB_THRESHOLD = 3; // Nodes with >= 3 children will always show their label

// --- Interfaces ---
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

const TopologyGraph: React.FC<GraphProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutHasRun = useRef(false);

  // 1. Initialize Cytoscape (Runs Once)
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      minZoom: 0.05,
      maxZoom: 3,
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
            'curve-style': 'bezier',
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
      // Force label visible on hover
      node.addClass('hovered');
      // Highlight edges? Optional:
      // node.connectedEdges().animate({ style: { 'line-color': '#64748b', width: 2 } }, { duration: 100 });
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

  // 2. Handle Data Updates
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !data) return;

    cy.batch(() => {
      const dereferencedSet = new Set(data.dereferenceOrder);
      const activeNodeId = data.childNode;
      console.log("Starting batch")
      Object.entries(data.indexToNodeDict).forEach(([idStr, url]) => {
        console.log(`Adding: ${url}`)
        if (url.endsWith('.meta')) return;
        const id = parseInt(idStr);
        const existing = cy.getElementById(idStr);

        // Status Checks
        const isDereferenced = dereferencedSet.has(id);
        const isActive = id === activeNodeId;
        
        // Topology Checks
        const parents = data.adjacencyListIn[id];
        const children = data.adjacencyListOut[id];
        
        const isRoot = !parents || parents.length === 0;
        
        // Hub Check: Does it point to many things?
        const isHub = children && children.length >= HUB_THRESHOLD;

        const classes = [
          isDereferenced ? 'dereferenced' : '',
          isActive ? 'active' : '',
          isRoot ? 'root' : '',
          isHub ? 'hub' : '' // This class triggers 'text-opacity: 1'
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

      Object.entries(data.adjacencyListOut).forEach(([sourceStr, targets]) => {
        
        targets.forEach(targetId => {
          if (data.indexToNodeDict[targetId]!.endsWith('.meta')) return;
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
      // --- PHASE 3: Post-Filter & Deduplication ---
      const seenLabels = new Map<string, string>(); // shortLabel -> keeperNodeId
      const nodesToRemove = cy.collection();

      cy.nodes().forEach((node) => {
        if (nodesToRemove.has(node)) return;

        const shortLabel = node.data('shortLabel');
        if (!shortLabel) return;

        if (seenLabels.has(shortLabel)) {
          const keeperId = seenLabels.get(shortLabel)!;
          
          // 1. Rewire Edges: SAFELY move connections to the Keeper
          node.connectedEdges().forEach((edge) => {
            const isSource = edge.source().id() === node.id();
            const otherSideId = isSource ? edge.target().id() : edge.source().id();

            // Prevent self-loops (Keeper -> Keeper)
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
      runSpaciousLayout(cy);
      layoutHasRun.current = true;
    }
  }, [data]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', background: '#f8fafc' }} 
    />
  );
};

// --- Layout Config (Same spacious layout as before) ---
const runSpaciousLayout = (cy: cytoscape.Core) => {
  cy.layout({
    name: 'cose',
    animate: false,
    nodeRepulsion: 12000,   
    idealEdgeLength: 80,    
    gravity: 0.5,           
    nodeOverlap: 10,
    nestingFactor: 0.8,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    padding: 50,
    fit: true,
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