import React, { type CSSProperties, useEffect, useRef, useMemo, useState, useCallback } from 'react';
import TopologyGraph from './TopologyGraph.js';
import type { UpdateProcessor } from '../api/UpdateProcessor.js';
import type { QueryMetrics } from '../../App.js';

interface TopologyData {
  totalSources: number;
  totalRequests: number;
  activeRequests: number;
  visitedUris: string[];
  [key: string]: any; 
}

interface GraphStats {
  nodes: number;
  edges: number;
  uris: string[];
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
  processor: UpdateProcessor | null;
  isTrackingEnabled?: boolean;
  metrics: QueryMetrics;
  isQueryRunning?: boolean;
}

// --- HELPER: Performance Graph Component ---
const PerformancePanel: React.FC<{ metrics: QueryMetrics; isRunning: boolean }> = ({ metrics, isRunning }) => {
  // 1. High-Frequency State (For the Text Timer - 60fps)
  const [uiTimer, setUiTimer] = useState(0);
  
  // 2. Low-Frequency State (For the Graph - Throttled)
  const [graphTime, setGraphTime] = useState(0);

  // --- LOGIC 1: High Speed Text Timer ---
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const now = performance.now();
      const currentElapsed = now - metrics.startTime;
      setUiTimer(currentElapsed);
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isRunning && metrics.startTime > 0) {
      tick();
    } else {
      // Set final static time when stopped
      if (metrics.endTime > 0 && metrics.startTime > 0) {
        setUiTimer(metrics.endTime - metrics.startTime);
      } else {
        setUiTimer(0);
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, metrics.startTime, metrics.endTime]);

  // --- LOGIC 2: Low Speed Graph Update (Throttled) ---
  useEffect(() => {
    // If finished, just sync immediately
    if (!isRunning) {
        setGraphTime(uiTimer);
        return;
    }

    // A. Update immediately if a new result arrived (Instant Feedback)
    setGraphTime(performance.now() - metrics.startTime);

    // B. Otherwise, throttle updates to max 5 times a second (200ms)
    // This prevents the heavy SVG from redrawing 60 times a second for no reason.
    const interval = setInterval(() => {
        setGraphTime(performance.now() - metrics.startTime);
    }, 200);

    return () => clearInterval(interval);
  }, [metrics.resultCount, isRunning, metrics.startTime, uiTimer]); 
  // ^ Dependency on resultCount ensures we draw dots instantly when they arrive

  // 3. SVG Graph Calculation (Uses graphTime, not uiTimer)
  const { path, maxTime, maxResults } = useMemo(() => {
    if (metrics.arrivalTimes.length === 0) return { path: '', maxTime: 0, maxResults: 0 };

    const width = 1000; 
    const height = 500; 

    // Determine X-axis scale using the Throttled Graph Time
    const totalDuration = (metrics.endTime > 0) 
      ? (metrics.endTime - metrics.startTime) 
      : graphTime;

    const lastArrival = metrics.arrivalTimes[metrics.arrivalTimes.length - 1];
    const computedMaxTime = Math.max(totalDuration, lastArrival!, 1);
    const computedMaxResults = Math.max(metrics.resultCount, 1);
    
    let d = `M 0 ${height}`;

    metrics.arrivalTimes.forEach((t, i) => {
      const count = i + 1;
      const x = (t / computedMaxTime) * width;
      const y = height - ((count / computedMaxResults) * height);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    if (isRunning) {
        d += ` L ${width} ${0}`; 
    } else {
        const xEnd = (totalDuration / computedMaxTime) * width;
        d += ` L ${xEnd.toFixed(1)} ${0}`;
    }

    return { path: d, maxTime: computedMaxTime, maxResults: computedMaxResults };
  }, [metrics.arrivalTimes, metrics.resultCount, metrics.endTime, metrics.startTime, graphTime, isRunning]);

  return (
    <div style={styles.perfContainer}>
      <div style={styles.perfHeader}>
        <div style={styles.perfCard}>
           <div style={styles.perfLabel}>Execution Time</div>
           {/* Use uiTimer for smooth counting */}
           <div style={styles.perfValue}>{(uiTimer / 1000).toFixed(2)}s</div>
        </div>
        <div style={styles.perfCard}>
           <div style={styles.perfLabel}>Total Results</div>
           <div style={styles.perfValue}>{metrics.resultCount}</div>
        </div>
        <div style={styles.perfCard}>
           <div style={styles.perfLabel}>Avg Speed</div>
           <div style={styles.perfValue}>
             {uiTimer > 0 ? ((metrics.resultCount / uiTimer) * 1000).toFixed(0) : 0} <span style={{fontSize:'0.6rem'}}>res/s</span>
           </div>
        </div>
      </div>

      <div style={styles.graphWrapper}>
        <div style={{...styles.graphTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{ fontSize: '0.9rem' }}>Results over Time</span>
            <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
              Y: Results &nbsp;|&nbsp; X: Time (s)
            </span>
        </div>
        
        {metrics.resultCount > 0 ? (
          <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
            {/* Y-AXIS LABELS */}
            <div style={styles.axisLabelYTop}>{maxResults}</div>
            <div style={styles.axisLabelYMid}>{Math.round(maxResults / 2)}</div>
            <div style={styles.axisLabelYBot}>0</div>

            <svg viewBox="0 0 1000 500" style={styles.svgGraph} preserveAspectRatio="none">
              <line x1="0" y1="500" x2="1000" y2="500" stroke="#e2e8f0" strokeWidth="2" />
              <line x1="0" y1="0" x2="0" y2="500" stroke="#e2e8f0" strokeWidth="2" />
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#f1f5f9" strokeWidth="2" strokeDasharray="8" />
              
              <path d={path} fill="none" stroke="#2563eb" strokeWidth="4" vectorEffect="non-scaling-stroke" />
              <path d={`${path} L 1000 500 L 0 500 Z`} fill="url(#gradient)" opacity="0.2" />
              <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* X-AXIS LABELS */}
            <div style={styles.axisLabelXLeft}>0s</div>
            <div style={styles.axisLabelXMid}>{((maxTime / 1000) / 2).toFixed(1)}s</div>
            <div style={styles.axisLabelXRight}>{(maxTime / 1000).toFixed(1)}s</div>
          </div>
        ) : (
          <div style={styles.emptyGraph}>Waiting for results...</div>
        )}
      </div>
    </div>
  );
};


// --- EXISTING HELPERS ---
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

const countUniquePods = (uris: string[]): number => {
  const uniquePods = new Set<string>();
  const podRegex = /(.*\/pods\/\d+)/;
  uris.forEach((uri) => {
    const match = uri.match(podRegex);
    if (match && match[1]) uniquePods.add(match[1]);
  });
  return uniquePods.size;
};

type LogCategory = 'traverse' | 'planning' | 'general';
const getLogCategory = (message: string): LogCategory => {
  const msg = message.toLowerCase();
  if (msg.includes('identified') || msg.includes('requesting') || msg.includes('source') || msg.includes('fetch') || msg.includes('dereferenc')) return 'traverse';
  if (msg.includes('determined') || msg.includes('plan') || msg.includes('optim') || msg.includes('order')) return 'planning';
  return 'general';
};

const QueryDebugger: React.FC<QueryDebuggerProps> = ({
  isOpen,
  onClose,
  currentQuery,
  logs,
  topology,
  processor,
  isTrackingEnabled = true,
  metrics,
  isQueryRunning = metrics?.isQueryRunning ?? false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logWindowRef = useRef<HTMLDivElement>(null);
  
  const [queryHeight, setQueryHeight] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [graphResetKey, setGraphResetKey] = useState(0);

  const [stats, setStats] = useState<GraphStats>({ nodes: 0, edges: 0, uris: [] });

  useEffect(() => {
    if (!processor) {
      setStats({ nodes: 0, edges: 0, uris: [] });
      return;
    }
    setStats(processor.getCounts());
    const unsubscribe = processor.subscribe(() => {
       setStats(processor.getCounts());
    });
    return () => unsubscribe();
  }, [processor]);

  const [viewMode, setViewMode] = useState<'stats' | 'graph' | 'performance'>(() => {
    const saved = localStorage.getItem('debugger_view_mode');
    return (saved === 'graph' || saved === 'performance') ? saved : 'stats';
  });

  useEffect(() => {
    localStorage.setItem('debugger_view_mode', viewMode);
  }, [viewMode]);

  const [showTraverse, setShowTraverse] = useState(() => JSON.parse(localStorage.getItem('debugger_filter_traverse') || 'true'));
  const [showPlanning, setShowPlanning] = useState(() => JSON.parse(localStorage.getItem('debugger_filter_planning') || 'true'));

  useEffect(() => { localStorage.setItem('debugger_filter_traverse', JSON.stringify(showTraverse)); }, [showTraverse]);
  useEffect(() => { localStorage.setItem('debugger_filter_planning', JSON.stringify(showPlanning)); }, [showPlanning]);

  const filteredLogs = useMemo(() => {
    const result = [];
    for (const log of logs) {
      const category = getLogCategory(log.message);
      if (category === 'traverse' && !showTraverse) continue;
      if (category === 'planning' && !showPlanning) continue;
      if (log.message.includes('First entry')) continue;
      result.push({ ...log, category });
    }
    return result;
  }, [logs, logs.length, showTraverse, showPlanning]);

  const displayLogs = filteredLogs.slice(-1000);
  const filterKey = `filter-${showTraverse}-${showPlanning}-${displayLogs.length}`;

  useEffect(() => {
    if (logWindowRef.current) {
        setTimeout(() => {
            if (logWindowRef.current) {
                logWindowRef.current.scrollTop = logWindowRef.current.scrollHeight;
            }
        }, 0);
    }
  }, [filterKey]);

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

  const handleGraphTabClick = () => {
    setViewMode('graph');
    setGraphResetKey(prev => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div ref={containerRef} style={{...styles.sidebarContainer, userSelect: isResizing ? 'none' : 'auto', cursor: isResizing ? 'row-resize' : 'auto'}}>
      <div style={styles.content}>
        
        <div style={styles.toolbar}>
          <div style={{...styles.statusBadge, backgroundColor: isTrackingEnabled ? '#f0fdf4' : '#fef2f2', color: isTrackingEnabled ? '#16a34a' : '#dc2626', borderColor: isTrackingEnabled ? '#bbf7d0' : '#fecaca'}}>
            {isTrackingEnabled ? '● TRACKING ACTIVE' : '○ TRACKING PAUSED'}
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}><input type="checkbox" checked={showTraverse} onChange={(e) => setShowTraverse(e.target.checked)} /> Traverse</label>
            <label style={styles.filterLabel}><input type="checkbox" checked={showPlanning} onChange={(e) => setShowPlanning(e.target.checked)} /> Planning</label>
          </div>
        </div>

        {(topology || processor) && (
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('stats')} style={viewMode === 'stats' ? styles.activeTab : styles.tab}>Query & Logs</button>
            <button onClick={() => setViewMode('performance')} style={viewMode === 'performance' ? styles.activeTab : styles.tab}>Performance</button>
            <button onClick={handleGraphTabClick} style={viewMode === 'graph' ? styles.activeTab : styles.tab}>Topology Graph</button>
          </div>
        )}

        {viewMode === 'graph' && processor ? (
          <div style={styles.fullGraphContainer}>
            <TopologyGraph processor={processor} key={`${currentQuery}-${graphResetKey}`} />
          </div>
        ) : viewMode === 'performance' ? (
          <div style={styles.performanceContainer}>
            <PerformancePanel metrics={metrics} isRunning={!!isQueryRunning} />
          </div>
        ) : (
          <>
            {processor && (
              <div style={styles.topologyDashboard}>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Total Documents</span>
                  <span style={styles.statValue}>{stats.nodes}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Total Links</span>
                  <span style={styles.statValue}>{stats.edges}</span>
                </div>
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Total Unique Pods</span>
                  <span style={styles.statValue}>{countUniquePods(stats.uris)}</span>
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
              <h3 style={styles.sectionTitle}>
                Engine Logs ({filteredLogs.length}), showing last {displayLogs.length}
              </h3>
              
              <div ref={logWindowRef} key={filterKey} style={styles.logWindow}>
                {displayLogs.length > 0 ? (
                  displayLogs.map((log: any, index: number) => (
                    <div key={`${log.id}-${index}`} style={styles.logLine}>
                      {log.category !== 'general' && (
                        <span style={{
                            ...styles.categoryBadge,
                            backgroundColor: log.category === 'traverse' ? '#3b82f6' : '#8b5cf6'
                        }}>
                            {log.category === 'traverse' ? 'TRAV' : 'PLAN'}
                        </span>
                      )}
                      
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
  
  fullGraphContainer: { flex: 1, background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden', minHeight: 0 },
  
  // Performance Page
  performanceContainer: { flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' },
  perfHeader: { display: 'flex', gap: '1rem', flexShrink: 0 },
  perfCard: { flex: 1, background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  perfLabel: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' },
  perfValue: { fontSize: '1.5rem', color: '#0f172a', fontWeight: 800, fontFamily: 'monospace' },
  
  graphWrapper: { background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem 1rem 2rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  graphTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '1rem' },
  svgGraph: { width: '100%', height: '100%', minHeight: '0' },
  emptyGraph: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' },

  // --- AXIS LABELS ---
  axisLabelYTop: { position: 'absolute', left: '-25px', top: -5, fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' },
  axisLabelYMid: { position: 'absolute', left: '-25px', top: '50%', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' },
  axisLabelYBot: { position: 'absolute', left: '-25px', bottom: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' },
  
  axisLabelXLeft: { position: 'absolute', left: 0, bottom: '-22px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' },
  axisLabelXMid: { position: 'absolute', left: '50%', bottom: '-22px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', transform: 'translateX(-50%)' },
  axisLabelXRight: { position: 'absolute', right: 0, bottom: '-22px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' },

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
  logLine: { margin: '4px 0', display: 'flex', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '2px', alignItems: 'center' },
  timestamp: { color: '#475569', fontSize: '0.6rem', flexShrink: 0, minWidth: '40px' },
  emptyLogs: { opacity: 0.5, padding: '20px', textAlign: 'center', fontSize: '0.8rem' },
  categoryBadge: { fontSize: '0.5rem', padding: '1px 4px', borderRadius: '3px', color: '#fff', fontWeight: 'bold', marginRight: '6px', letterSpacing: '0.5px' }
};

export default QueryDebugger;