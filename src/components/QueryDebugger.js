import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import TopologyGraph from './TopologyGraph.js';
// ... (formatQuery helper remains the same) ...
const formatQuery = (query) => {
    if (!query)
        return '';
    const lines = query.split('\n');
    const indents = lines.filter(l => l.trim().length > 0).map(l => l.search(/\S/)).filter(i => i !== -1);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
    const cleanLines = lines
        .map(line => (line.length >= minIndent ? line.slice(minIndent) : line).trimEnd())
        .filter((line, index, arr) => !(index === 0 && line === "") && !(index === arr.length - 1 && line === ""));
    if (cleanLines.length > 0)
        cleanLines[0] = "\t" + cleanLines[0].trimStart();
    const finalString = cleanLines.join('\n');
    let escaped = finalString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped
        .replace(/\b(SELECT|WHERE|PREFIX|OPTIONAL|FILTER|LIMIT|OFFSET|ORDER BY|DISTINCT|GRAPH|UNION|CONSTRUCT|ASK|DESCRIBE)\b/gi, '<span style="color: #c678dd; font-weight: bold;">$1</span>')
        .replace(/(\?[a-zA-Z0-9_]+)/g, '<span style="color: #d19a66;">$1</span>')
        .replace(/(&lt;https?:\/\/[^&]+&gt;)/g, '<span style="color: #98c379;">$1</span>')
        .replace(/\b([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)\b/g, '<span style="color: #61afef;">$1</span>');
};
const QueryDebugger = ({ isOpen, onClose, currentQuery, logs, topology, isTrackingEnabled = true }) => {
    const containerRef = useRef(null);
    const [queryHeight, setQueryHeight] = useState(220);
    const [isResizing, setIsResizing] = useState(false);
    // Force graph reset when clicking the tab again
    const [graphResetKey, setGraphResetKey] = useState(0);
    // 1. PERSISTENCE: Initialize viewMode from LocalStorage
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('debugger_view_mode');
        return saved === 'graph' ? 'graph' : 'stats';
    });
    useEffect(() => {
        localStorage.setItem('debugger_view_mode', viewMode);
    }, [viewMode]);
    const [showTraverse, setShowTraverse] = useState(() => JSON.parse(localStorage.getItem('debugger_filter_traverse') || 'true'));
    const [showPlanning, setShowPlanning] = useState(() => JSON.parse(localStorage.getItem('debugger_filter_planning') || 'true'));
    useEffect(() => { localStorage.setItem('debugger_filter_traverse', JSON.stringify(showTraverse)); }, [showTraverse]);
    useEffect(() => { localStorage.setItem('debugger_filter_planning', JSON.stringify(showPlanning)); }, [showPlanning]);
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const msg = log.message.trim();
            const isTraverse = /^(Identified|Requesting)/i.test(msg) || msg.includes('Identified as');
            const isPlanning = /^(Determined)/i.test(msg);
            if (isTraverse && !showTraverse)
                return false;
            if (isPlanning && !showPlanning)
                return false;
            return true;
        });
    }, [logs, showTraverse, showPlanning]);
    const startResizing = useCallback((e) => { e.preventDefault(); setIsResizing(true); }, []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((e) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newHeight = e.clientY - containerRect.top - 120;
            if (newHeight > 80 && newHeight < containerRect.height * 0.8)
                setQueryHeight(newHeight);
        }
    }, [isResizing]);
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);
    const highlightedQuery = useMemo(() => formatQuery(currentQuery), [currentQuery]);
    const handleGraphTabClick = () => {
        setViewMode('graph');
        // Increment reset key to force redraw even if already on graph view
        setGraphResetKey(prev => prev + 1);
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { ref: containerRef, style: { ...styles.sidebarContainer, userSelect: isResizing ? 'none' : 'auto', cursor: isResizing ? 'row-resize' : 'auto' }, children: _jsxs("div", { style: styles.content, children: [_jsxs("div", { style: styles.toolbar, children: [_jsx("div", { style: { ...styles.statusBadge, backgroundColor: isTrackingEnabled ? '#f0fdf4' : '#fef2f2', color: isTrackingEnabled ? '#16a34a' : '#dc2626', borderColor: isTrackingEnabled ? '#bbf7d0' : '#fecaca' }, children: isTrackingEnabled ? '● TRACKING ACTIVE' : '○ TRACKING PAUSED' }), _jsxs("div", { style: styles.filterGroup, children: [_jsxs("label", { style: styles.filterLabel, children: [_jsx("input", { type: "checkbox", checked: showTraverse, onChange: (e) => setShowTraverse(e.target.checked) }), " Traverse"] }), _jsxs("label", { style: styles.filterLabel, children: [_jsx("input", { type: "checkbox", checked: showPlanning, onChange: (e) => setShowPlanning(e.target.checked) }), " Planning"] })] })] }), topology && (_jsxs("div", { style: styles.viewToggle, children: [_jsx("button", { onClick: () => setViewMode('stats'), style: viewMode === 'stats' ? styles.activeTab : styles.tab, title: "Show Logs and Query", children: "\uD83D\uDCDD Query & Logs" }), _jsx("button", { onClick: handleGraphTabClick, style: viewMode === 'graph' ? styles.activeTab : styles.tab, title: "Show Full Screen Topology (Click to Reset)", children: "\uD83D\uDD78\uFE0F Topology Graph" })] })), viewMode === 'graph' && topology ? (
                // FULL HEIGHT GRAPH MODE
                _jsx("div", { style: styles.fullGraphContainer, children: _jsx(TopologyGraph
                    // KEY CHANGE: Combining query + reset key ensures:
                    // 1. Reset when query changes
                    // 2. Reset when tab is toggled or clicked again
                    , { 
                        // KEY CHANGE: Combining query + reset key ensures:
                        // 1. Reset when query changes
                        // 2. Reset when tab is toggled or clicked again
                        data: topology.data, update: topology.update }, `${currentQuery}-${graphResetKey}`) })) : (
                // STANDARD DEBUG MODE (Stats + Query + Logs)
                _jsxs(_Fragment, { children: [_jsxs("section", { style: { ...styles.querySection, height: queryHeight }, children: [_jsx("h3", { style: styles.sectionTitle, children: "SPARQL Query" }), _jsx("div", { style: styles.codeWrapper, children: _jsx("pre", { style: styles.codeBlock, dangerouslySetInnerHTML: { __html: highlightedQuery } }) })] }), _jsx("div", { onMouseDown: startResizing, style: { ...styles.resizer, backgroundColor: isResizing ? '#3b82f6' : 'transparent' }, children: _jsx("div", { style: styles.resizerHandle }) }), _jsxs("section", { style: styles.logSection, children: [_jsxs("h3", { style: styles.sectionTitle, children: ["Engine Logs (", filteredLogs.length, ")"] }), _jsx("div", { style: styles.logWindow, children: filteredLogs.length > 0 ? (filteredLogs.map((log) => (_jsxs("div", { style: styles.logLine, children: [_jsx("span", { style: styles.timestamp, children: log.timestamp }), _jsx("span", { style: { color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#e2e8f0', wordBreak: 'break-word' }, children: log.message })] }, log.id)))) : (_jsx("div", { style: styles.emptyLogs, children: "No logs match active filters..." })) })] })] }))] }) }));
};
// ... (styles remain exactly the same) ...
const styles = {
    sidebarContainer: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#ffffff', borderLeft: '1px solid #e2e8f0', overflow: 'hidden' },
    content: { padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
    toolbar: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' },
    statusBadge: { padding: '6px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, border: '1px solid', letterSpacing: '0.05em' },
    filterGroup: { display: 'flex', gap: '0.8rem' },
    filterLabel: { fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' },
    viewToggle: { display: 'flex', gap: '8px', marginBottom: '8px', flexShrink: 0 },
    tab: { background: 'none', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' },
    activeTab: { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#1e293b', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    fullGraphContainer: { flex: 1, background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden', minHeight: 0 },
    topologyDashboard: { display: 'flex', gap: '1rem', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1rem', flexShrink: 0 },
    statBox: { display: 'flex', flexDirection: 'column' },
    statLabel: { fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 },
    statValue: { fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' },
    querySection: { display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0, overflow: 'hidden' },
    sectionTitle: { fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 },
    codeWrapper: { background: '#1e293b', borderRadius: '6px', padding: '12px', border: '1px solid #0f172a', height: '100%', overflowY: 'auto' },
    codeBlock: { color: '#cbd5e1', fontSize: '0.8rem', margin: 0, fontFamily: 'monospace', lineHeight: '1.6', whiteSpace: 'pre-wrap', paddingLeft: '1.5rem', textIndent: '-1.5rem' },
    resizer: { height: '10px', margin: '4px 0', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    resizerHandle: { width: '30px', height: '3px', borderRadius: '2px', background: '#e2e8f0' },
    logSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 },
    logWindow: { flex: 1, background: '#0f172a', color: '#94a3b8', padding: '12px', borderRadius: '6px', fontSize: '0.75rem', overflowY: 'auto', fontFamily: 'monospace' },
    logLine: { margin: '4px 0', display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '2px' },
    timestamp: { color: '#475569', fontSize: '0.6rem', flexShrink: 0 },
    emptyLogs: { opacity: 0.5, padding: '20px', textAlign: 'center', fontSize: '0.8rem' }
};
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.js.map