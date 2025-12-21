import React, { type CSSProperties, useEffect, useRef, useMemo, useState, useCallback } from 'react';
import TopologyGraph from './TopologyGraph.js';

interface TopologyData {
  totalSources: number;
  totalRequests: number;
  activeRequests: number;
  visitedUris: string[];
  [key: string]: any; 
}

interface LogEntry {
  id: number;
  message: string;
  timestamp: string;
  level?: 'info' | 'warn' | 'error';
}

interface QueryDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery: string;
  logs: LogEntry[];
  topology: TopologyData | null;
  isTrackingEnabled?: boolean;
}

const formatQuery = (query: string) => {
  if (!query) return '';
  const lines = query.split('\n');
  const indents = lines.filter(l => l.trim().length > 0).map(l => l.search(/\S/)).filter(i => i !== -1);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  const cleanLines = lines
    .map(line => (line.length >= minIndent ? line.slice(minIndent) : line).trimEnd())
    .filter((line, index, arr) => !(index === 0 && line === "") && !(index === arr.length - 1 && line === ""));
  if (cleanLines.length > 0) cleanLines[0] = "\t" + cleanLines[0]!.trimStart();
  const finalString = cleanLines.join('\n');
  let escaped = finalString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/\b(SELECT|WHERE|PREFIX|OPTIONAL|FILTER|LIMIT|OFFSET|ORDER BY|DISTINCT|GRAPH|UNION|CONSTRUCT|ASK|DESCRIBE)\b/gi, '<span style="color: #c678dd; font-weight: bold;">$1</span>')
    .replace(/(\?[a-zA-Z0-9_]+)/g, '<span style="color: #d19a66;">$1</span>')
    .replace(/(&lt;https?:\/\/[^&]+&gt;)/g, '<span style="color: #98c379;">$1</span>')
    .replace(/\b([a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)\b/g, '<span style="color: #61afef;">$1</span>');
};

const QueryDebugger: React.FC<QueryDebuggerProps> = ({
  isOpen,
  onClose,
  currentQuery,
  logs,
  topology,
  isTrackingEnabled = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [queryHeight, setQueryHeight] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  
  // 1. PERSISTENCE: Initialize viewMode from LocalStorage
  const [viewMode, setViewMode] = useState<'stats' | 'graph'>(() => {
    const saved = localStorage.getItem('debugger_view_mode');
    return saved === 'graph' ? 'graph' : 'stats';
  });

  // 2. PERSISTENCE: Save viewMode on change
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
      if (isTraverse && !showTraverse) return false;
      if (isPlanning && !showPlanning) return false;
      return true;
    });
  }, [logs, showTraverse, showPlanning]);

  const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - containerRect.top - 120;
      if (newHeight > 80 && newHeight < containerRect.height * 0.8) setQueryHeight(newHeight);
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

  if (!isOpen) return null;

  return (
    <div ref={containerRef} style={{...styles.sidebarContainer, userSelect: isResizing ? 'none' : 'auto', cursor: isResizing ? 'row-resize' : 'auto'}}>
      <div style={styles.content}>
        
        {/* HEADER AREA */}
        <div style={styles.toolbar}>
          <div style={{...styles.statusBadge, backgroundColor: isTrackingEnabled ? '#f0fdf4' : '#fef2f2', color: isTrackingEnabled ? '#16a34a' : '#dc2626', borderColor: isTrackingEnabled ? '#bbf7d0' : '#fecaca'}}>
            {isTrackingEnabled ? '● TRACKING ACTIVE' : '○ TRACKING PAUSED'}
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}><input type="checkbox" checked={showTraverse} onChange={(e) => setShowTraverse(e.target.checked)} /> Traverse</label>
            <label style={styles.filterLabel}><input type="checkbox" checked={showPlanning} onChange={(e) => setShowPlanning(e.target.checked)} /> Planning</label>
          </div>
        </div>

        {/* VIEW TOGGLE */}
        {topology && (
          <div style={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('stats')} 
              style={viewMode === 'stats' ? styles.activeTab : styles.tab}
              title="Show Logs and Query"
            >
              📝 Query & Logs
            </button>
            <button 
              onClick={() => setViewMode('graph')} 
              style={viewMode === 'graph' ? styles.activeTab : styles.tab}
              title="Show Full Screen Topology"
            >
              🕸️ Topology Graph
            </button>
          </div>
        )}

        {/* 3. CONDITIONAL RENDER: FULL GRAPH vs STANDARD VIEW */}
        {viewMode === 'graph' && topology ? (
          // FULL HEIGHT GRAPH MODE
          <div style={styles.fullGraphContainer}>
            <TopologyGraph data={topology as any} />
          </div>
        ) : (
          // STANDARD DEBUG MODE (Stats + Query + Logs)
          <>
            {topology && (
              <div style={styles.topologyDashboard}>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Sources</span>
                  <span style={styles.statValue}>{topology.totalSources || 0}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Requests</span>
                  <span style={styles.statValue}>{topology.totalRequests || 0}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Active</span>
                  <span style={{...styles.statValue, color: (topology.activeRequests || 0) > 0 ? '#3b82f6' : '#94a3b8'}}>{topology.activeRequests || 0}</span>
                </div>
              </div>
            )}

            <section style={{ ...styles.querySection, height: queryHeight }}>
              <h3 style={styles.sectionTitle}>SPARQL Query</h3>
              <div style={styles.codeWrapper}>
                <pre style={styles.codeBlock} dangerouslySetInnerHTML={{ __html: highlightedQuery }} />
              </div>
            </section>

            <div onMouseDown={startResizing} style={{...styles.resizer, backgroundColor: isResizing ? '#3b82f6' : 'transparent'}}>
              <div style={styles.resizerHandle} />
            </div>

            <section style={styles.logSection}>
              <h3 style={styles.sectionTitle}>Engine Logs ({filteredLogs.length})</h3>
              <div style={styles.logWindow}>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div key={log.id} style={styles.logLine}>
                      <span style={styles.timestamp}>{log.timestamp}</span>
                      <span style={{ color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#e2e8f0', wordBreak: 'break-word'}}>
                        {log.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyLogs}>No logs match active filters...</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: CSSProperties } = {
  sidebarContainer: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#ffffff', borderLeft: '1px solid #e2e8f0', overflow: 'hidden' },
  content: { padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' },
  statusBadge: { padding: '6px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, border: '1px solid', letterSpacing: '0.05em' },
  filterGroup: { display: 'flex', gap: '0.8rem' },
  filterLabel: { fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' },
  
  viewToggle: { display: 'flex', gap: '8px', marginBottom: '8px', flexShrink: 0 },
  tab: { background: 'none', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' },
  activeTab: { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#1e293b', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  
  // New style for the full screen graph
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