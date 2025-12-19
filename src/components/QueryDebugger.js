import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
const formatQuery = (query) => {
    if (!query)
        return '';
    const lines = query.split('\n');
    const indents = lines
        .filter(line => line.trim().length > 0)
        .map(line => line.search(/\S/))
        .filter(indent => indent !== -1);
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
const QueryDebugger = ({ isOpen, onClose, currentQuery, logs, isTrackingEnabled = true }) => {
    const containerRef = useRef(null);
    const [queryHeight, setQueryHeight] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    // Filter States
    const [showTraverse, setShowTraverse] = useState(true);
    const [showPlanning, setShowPlanning] = useState(true);
    // Filter Logic
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
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((e) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newHeight = e.clientY - containerRect.top - 60;
            if (newHeight > 100 && newHeight < containerRect.height * 0.7) {
                setQueryHeight(newHeight);
            }
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
    if (!isOpen)
        return null;
    return (_jsx("div", { ref: containerRef, style: {
            ...styles.sidebarContainer,
            userSelect: isResizing ? 'none' : 'auto',
            cursor: isResizing ? 'row-resize' : 'auto'
        }, children: _jsxs("div", { style: styles.content, children: [_jsxs("div", { style: styles.toolbar, children: [_jsx("div", { style: {
                                ...styles.statusBadge,
                                backgroundColor: isTrackingEnabled ? '#f0fdf4' : '#fef2f2',
                                color: isTrackingEnabled ? '#16a34a' : '#dc2626',
                                borderColor: isTrackingEnabled ? '#bbf7d0' : '#fecaca'
                            }, children: isTrackingEnabled ? '● TRACKING ACTIVE' : '○ TRACKING PAUSED' }), _jsxs("div", { style: styles.filterGroup, children: [_jsxs("label", { style: styles.filterLabel, children: [_jsx("input", { type: "checkbox", checked: showTraverse, onChange: (e) => setShowTraverse(e.target.checked) }), "Show Traverse"] }), _jsxs("label", { style: styles.filterLabel, children: [_jsx("input", { type: "checkbox", checked: showPlanning, onChange: (e) => setShowPlanning(e.target.checked) }), "Show Planning"] })] })] }), _jsxs("section", { style: { ...styles.querySection, height: queryHeight }, children: [_jsx("h3", { style: styles.sectionTitle, children: "SPARQL Query" }), _jsx("div", { style: styles.codeWrapper, children: _jsx("pre", { style: styles.codeBlock, dangerouslySetInnerHTML: { __html: highlightedQuery } }) })] }), _jsx("div", { onMouseDown: startResizing, style: {
                        ...styles.resizer,
                        backgroundColor: isResizing ? '#3b82f6' : 'transparent'
                    }, children: _jsx("div", { style: styles.resizerHandle }) }), _jsxs("section", { style: styles.logSection, children: [_jsxs("h3", { style: styles.sectionTitle, children: ["Engine Logs (", filteredLogs.length, ")"] }), _jsx("div", { style: styles.logWindow, children: filteredLogs.length > 0 ? (filteredLogs.map((log) => (_jsxs("div", { style: styles.logLine, children: [_jsx("span", { style: styles.timestamp, children: log.timestamp }), _jsx("span", { style: {
                                            color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#e2e8f0',
                                            wordBreak: 'break-word'
                                        }, children: log.message })] }, log.id)))) : (_jsx("div", { style: styles.emptyLogs, children: "No logs match active filters..." })) })] })] }) }));
};
const styles = {
    sidebarContainer: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#ffffff', boxSizing: 'border-box', borderLeft: '1px solid #e2e8f0', overflow: 'hidden' },
    toolbar: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
    filterGroup: { display: 'flex', gap: '1rem', alignItems: 'center' },
    filterLabel: { fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' },
    content: { padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
    statusBadge: { padding: '6px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, border: '1px solid', letterSpacing: '0.05em', width: 'fit-content', flexShrink: 0 },
    querySection: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, overflow: 'hidden' },
    resizer: { height: '12px', margin: '4px 0', cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', borderRadius: '4px', flexShrink: 0 },
    resizerHandle: { width: '30px', height: '4px', borderRadius: '2px', background: '#e2e8f0' },
    logSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minHeight: 0 },
    sectionTitle: { margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.075em', color: '#94a3b8', fontWeight: 700 },
    codeWrapper: { background: '#1e293b', borderRadius: '6px', padding: '16px', border: '1px solid #0f172a', height: '100%', overflowY: 'auto' },
    codeBlock: { color: '#cbd5e1', fontSize: '0.85rem', margin: 0, fontFamily: '"Fira Code", monospace', lineHeight: '1.7', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal', paddingLeft: '1.5rem', textIndent: '-1.5rem' },
    logWindow: { flex: 1, background: '#0f172a', color: '#94a3b8', padding: '12px', borderRadius: '6px', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', overflowY: 'auto' },
    logLine: { margin: '6px 0', display: 'flex', gap: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' },
    timestamp: { color: '#475569', fontSize: '0.6rem', flexShrink: 0, fontFamily: 'monospace' },
    emptyLogs: { opacity: 0.5, fontStyle: 'italic', padding: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }
};
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.js.map