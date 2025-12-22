import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { StatisticTraversalTopology } from '@rubeneschauzier/statistic-traversal-topology';

import { Profile } from './src/pages/MyProfile.js';
import { ForumDetail } from './src/pages/ForumDetail.js';
import { UserProfileDetail } from './src/pages/ProfileDetail.js';
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
import { ReactTraversalLogger, type LogEntry } from './src/api/queryEngineStub.js';
import { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
// ...  ...

interface SolidUser {
  id: string;
  username: string;
  name: string;
}

const UserStatus: React.FC = () => {
  const { user, login, logout } = useAuth();

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.9rem' }}>Welcome, <strong>{user.name}</strong></span>
        <button 
          onClick={logout} 
          style={{ fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => login({
          id: '1',
          username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
          name: 'Solid Developer Test' 
      } as SolidUser)}
      style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}
    >
      Fake Login
    </button>
  );
};

const App: React.FC = () => {
  // If more info on traversal execution is being shown
  const [isDebugOpen, setDebugOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('solidlab_debug_sidebar_open');
    return saved !== null ? JSON.parse(saved) : false; // Default to false
  });
  useEffect(() => {
    localStorage.setItem('solidlab_debug_sidebar_open', JSON.stringify(isDebugOpen));
  }, [isDebugOpen]);

  // Sets current query for extended info panel
  const [currentQuery, setCurrentQuery] = useState<string>("No query executed yet.");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // If logging and topology tracking is enabled for a given query
  const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('solidlab_tracking_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  useEffect(() => {
    localStorage.setItem('solidlab_tracking_enabled', JSON.stringify(isTrackingEnabled));
  }, [isTrackingEnabled]);
  const isTrackingRef = useRef(isTrackingEnabled);

  useEffect(() => {
    isTrackingRef.current = isTrackingEnabled;
    
    // Clear logs immediately when disabled
    if (!isTrackingEnabled) {
      setLogs([]);
    }
  }, [isTrackingEnabled]);


  const handleNewLog = useCallback((entry: LogEntry) => {
    // We check the REF. This is always up-to-the-second accurate.
    if (isTrackingRef.current) {
      setLogs(prev => [...prev.slice(-5000), entry]); 
    }
  }, []);

  const traversalLogger = useMemo(() => 
    new ReactTraversalLogger('debug', handleNewLog), 
  [handleNewLog]);

  // Wrapped setter: only updates state if tracking is on
  const handleSetQuery = useCallback((query: string) => {
    setTopology({data: null, update: false});
    setCurrentQuery(query);
    setLogs([]);
  }, []);
  // 1. Add topology state
  const [topology, setTopology] = useState<any>(null);

// 1. Define Scale Limits
  const MIN_BATCH = 10;   // Start snappy
  const MAX_BATCH = 1000;  // Cap latency at high loads
  const SCALING_FACTOR = 25; // Increase batch size by 1 for every 50 nodes
  const FLUSH_TIMEOUT = 500; 

  const createTopologyTracker = useCallback(() => {
    setTopology({data: null, update: false});
    if (!isTrackingEnabled) return null;
  
    const trackerDiscovery = new StatisticLinkDiscovery();
    const trackerDereference = new StatisticLinkDereference();
    const tracker = new StatisticTraversalTopology(
      trackerDiscovery, trackerDereference
    );
    
    let eventBuffer = 0;
    let lastData: any = null;
    let flushTimer: NodeJS.Timeout | null = null;

    const flush = () => {
      // 1. Explicitly clear the timer reference so we don't think it's running
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      // 2. Only update if we actually have buffered data
      if (lastData) {
        setTopology({ data: lastData, update: true }); 
        eventBuffer = 0;
        lastData = null;
      }
    };

    tracker.on((data) => {
      lastData = data;
      eventBuffer++;

      // 2. Calculate Dynamic Batch Size
      const totalNodes = Object.keys(data.indexToNodeDict).length;
      const currentBatchTarget = Math.min(
        MAX_BATCH, 
        MIN_BATCH + Math.floor(totalNodes / SCALING_FACTOR)
      );

      if (eventBuffer >= currentBatchTarget) {
        flush();
      } else {
        if (flushTimer) {
          clearTimeout(flushTimer);
        }
        flushTimer = setTimeout(flush, FLUSH_TIMEOUT);
      }
    });
    return {trackerDiscovery, trackerDereference};
  }, [isTrackingEnabled]);

  return (
    <AuthProvider>
      <Router>
        {/* Navigation Bar */}
        <nav style={{ 
          padding: '0.75rem 2rem', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/" style={{ fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', fontSize: '1.2rem' }}>
              🧪 SolidLab
            </Link>
            <Link to="/profile" style={{ textDecoration: 'none', color: '#444', fontSize: '0.9rem' }}>My Profile</Link>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Performance Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b' }}>
              <input 
                type="checkbox" 
                checked={isTrackingEnabled} 
                onChange={() => setIsTrackingEnabled(!isTrackingEnabled)} 
              />
              {isTrackingEnabled ? '⚡ Tracking Active' : '⏸️ Tracking Paused'}
            </label>

            <UserStatus />
            
            <button 
              style={{ 
                background: isDebugOpen ? '#475569' : '#ef4444', 
                color: 'white', 
                border: 'none', 
                padding: '6px 14px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }} 
              onClick={() => setDebugOpen(!isDebugOpen)}
            >
              {isDebugOpen ? '✕ Hide Traversal' : '👁️ Show Traversal'}
            </button>
          </div>        
        </nav>

        <div style={{ display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
          
          {/* LEFT SIDE: The App (40%) */}
          <main style={{ 
            // When open, take 4 parts of the space. When closed, take 100%.
            flex: isDebugOpen ? 4 : 1, 
            background: '#f8fafc', 
            overflowY: 'auto',
            transition: 'flex 0.4s ease-in-out',
            borderRight: isDebugOpen ? '1px solid #e2e8f0' : 'none',
            minWidth: isDebugOpen ? '300px' : '100%' // Prevents app from disappearing
          }}>
            <Routes>            
              <Route path="/profile" element={
                <Profile
                setDebugQuery={handleSetQuery}
                logger={ isTrackingEnabled ? traversalLogger : undefined } 
                createTracker={createTopologyTracker}
                />} 
                />
              <Route path="/forums/:id" element={
                <ForumDetail 
                setDebugQuery={handleSetQuery} 
                logger={isTrackingEnabled ? traversalLogger : undefined}
                createTracker={createTopologyTracker}
                />} 
                />
              <Route path="/profiles/:id" element={
                <UserProfileDetail 
                setDebugQuery={handleSetQuery} 
                logger={isTrackingEnabled ? traversalLogger : undefined}
                createTracker={createTopologyTracker}
                />}
                />
              <Route path="*" element={<div style={{ padding: '2rem' }}><h2>404</h2></div>} />
            </Routes>
          </main>

          {/* RIGHT SIDE: The Debugger (60%) */}
          <aside style={{ 
            // When open, take 6 parts of the space. When closed, take 0.
            flex: isDebugOpen ? 6 : 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            transition: 'flex 0.4s ease-in-out',
            overflow: 'hidden', // Crucial: prevents content from bleeding out during transition
            visibility: isDebugOpen ? 'visible' : 'hidden'
          }}>
            {/* We wrap the debugger in a div with a fixed min-width 
                so the internal content doesn't "crunch" while animating.
            */}
            <div style={{ minWidth: '50vw', height: '100%' }}>
              <QueryDebugger 
                isOpen={isDebugOpen} 
                onClose={() => setDebugOpen(false)} 
                currentQuery={currentQuery} 
                isTrackingEnabled={isTrackingEnabled}
                topology={topology}
                logs={logs} 
              />
            </div>
          </aside>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;