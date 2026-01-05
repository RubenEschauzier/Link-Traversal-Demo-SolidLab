import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
const TopologyGraph = ({ processor }) => {
    const containerRef = useRef(null);
    const cyRef = useRef(null);
    const finalLayoutTimer = useRef(null);
    useEffect(() => {
        if (!containerRef.current || !processor)
            return;
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
                    } },
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
            if (e.target === cy)
                cy.nodes().removeClass('clicked');
        });
        cyRef.current = cy;
        // 3. SUBSCRIBE TO UPDATES
        const unsubscribe = processor.subscribe((payload) => {
            let allNodesHadCache = true;
            cy.batch(() => {
                if (payload.mode === 'replace')
                    cy.elements().remove();
                // Add Nodes
                if (payload.nodes.length > 0) {
                    cy.add(payload.nodes.map(n => {
                        // A. Check Position Cache
                        const cachedPos = processor.positionCache.get(n.id);
                        if (!cachedPos)
                            allNodesHadCache = false;
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
                        group: 'edges',
                        data: { id: e.id, source: e.source, target: e.target }
                    }));
                    cy.add(edgesToAdd);
                }
                // Update Statuses
                payload.statuses.forEach(s => {
                    const node = cy.getElementById(s.id);
                    if (node.nonempty())
                        node.addClass(s.status);
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
                }).run();
            }
            // Final Layout (Debounced snap)
            if (finalLayoutTimer.current)
                clearTimeout(finalLayoutTimer.current);
            finalLayoutTimer.current = window.setTimeout(() => {
                if (cy.destroyed())
                    return;
                cy.nodes().unlock();
                cy.layout({
                    name: 'cose', animate: false, randomize: false, initialTemp: 200,
                    nodeRepulsion: 100000, idealEdgeLength: 300, gravity: 0.1, fit: true, numIter: 1000
                }).run();
            }, 1000);
        });
        // 5. CLEANUP (SAVE STATE ON UNMOUNT)
        return () => {
            // Save everything to the processor before destroying
            if (processor && cy && !cy.destroyed()) {
                // A. Save Positions
                cy.nodes().forEach((node) => {
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
            if (finalLayoutTimer.current)
                clearTimeout(finalLayoutTimer.current);
        };
    }, [processor]);
    return _jsx("div", { ref: containerRef, style: { width: '100%', height: '100%' } });
};
const getDeterministicPosition = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return { x: (hash % 1000), y: ((hash * 31) % 1000) };
};
export default TopologyGraph;
//# sourceMappingURL=TopologyGraph.js.map