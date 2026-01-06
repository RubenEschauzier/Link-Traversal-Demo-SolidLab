import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { StatisticTraversalTopology } from '@rubeneschauzier/statistic-traversal-topology';
import { Profile } from './src/pages/MyProfile.js';
import { ForumDetail } from './src/pages/ForumDetail.js';
import { UserProfileDetail } from './src/pages/ProfileDetail.js';
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
import { ReactTraversalLogger } from './src/api/queryEngineStub.js';
import { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
import { UpdateProcessor } from './src/api/UpdateProcessor.js';
// --- 1. PREDEFINED USERS FOR DROPDOWN ---
const PREDEFINED_USERS = [
    {
        id: '933',
        name: 'Profile 933',
        username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me'
    },
    {
        id: '65',
        name: 'Profile 065 (no friends)',
        username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000065/profile/card#me'
    },
    {
        id: '296',
        name: 'Profile 296 (many friends and active forums)',
        username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000296/profile/card#me'
    },
    {
        id: '637',
        name: 'Profile 637',
        username: 'https://solidbench.linkeddatafragments.org/pods/00000002199023255637/profile/card#me'
    }
];
// --- 2. LANDING PAGE COMPONENT ---
const LandingPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [selectedUserId, setSelectedUserId] = useState(PREDEFINED_USERS[0].id);
    const handleLogin = (e) => {
        e.preventDefault();
        const user = PREDEFINED_USERS.find(u => u.id === selectedUserId);
        if (user) {
            login(user);
            navigate('/profile'); // Redirect to profile after login
        }
    };
    return (_jsx("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#334155'
        }, children: _jsxs("div", { style: {
                background: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }, children: [_jsx("h1", { style: { marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1e293b' }, children: "\uD83E\uDDEA SolidLab Login" }), _jsxs("form", { onSubmit: handleLogin, style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsxs("div", { style: { textAlign: 'left' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }, children: "Select a Test Identity" }), _jsx("select", { value: selectedUserId, onChange: (e) => setSelectedUserId(e.target.value), style: {
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '1rem'
                                    }, children: PREDEFINED_USERS.map(user => (_jsx("option", { value: user.id, children: user.name }, user.id))) }), _jsx("div", { style: { marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b', wordBreak: 'break-all' }, children: PREDEFINED_USERS.find(u => u.id === selectedUserId)?.username })] }), _jsx("button", { type: "submit", style: {
                                background: '#2563eb',
                                color: 'white',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginTop: '1rem'
                            }, children: "Login" })] })] }) }));
};
const UserStatus = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    if (user) {
        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("span", { style: { fontSize: '0.9rem' }, children: ["Welcome, ", _jsx("strong", { children: user.name })] }), _jsx("button", { onClick: () => {
                        logout();
                        navigate('/'); // Go back to landing on logout
                    }, style: { fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer' }, children: "Logout" })] }));
    }
    // If not logged in, we show a button to go to login page (if we are deeper in the app)
    return (_jsx(Link, { to: "/", style: { textDecoration: 'none' }, children: _jsx("button", { style: { background: '#2563eb', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }, children: "Go to Login" }) }));
};
const App = () => {
    // --- UI STATE ---
    const [isDebugOpen, setDebugOpen] = useState(() => {
        const saved = localStorage.getItem('solidlab_debug_sidebar_open');
        return saved !== null ? JSON.parse(saved) : false;
    });
    useEffect(() => {
        localStorage.setItem('solidlab_debug_sidebar_open', JSON.stringify(isDebugOpen));
    }, [isDebugOpen]);
    // --- QUERY & LOGS STATE ---
    const [currentQuery, setCurrentQuery] = useState("No query executed yet.");
    const [logs, setLogs] = useState([]);
    const [isTrackingEnabled, setIsTrackingEnabled] = useState(() => {
        const saved = localStorage.getItem('solidlab_tracking_enabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    useEffect(() => {
        localStorage.setItem('solidlab_tracking_enabled', JSON.stringify(isTrackingEnabled));
    }, [isTrackingEnabled]);
    const isTrackingRef = useRef(isTrackingEnabled);
    useEffect(() => {
        isTrackingRef.current = isTrackingEnabled;
        if (!isTrackingEnabled)
            setLogs([]);
    }, [isTrackingEnabled]);
    const handleNewLog = useCallback((entry) => {
        if (isTrackingRef.current) {
            setLogs(prev => [...prev.slice(-5000), entry]);
        }
    }, []);
    const traversalLogger = useMemo(() => new ReactTraversalLogger('debug', handleNewLog), [handleNewLog]);
    // Topology related states
    const [topologyStats, setTopologyStats] = useState(null);
    const [topologyProcessor, setTopologyProcessor] = useState(null);
    // --- METRICS LOGIC ---
    const metricsRef = useRef({
        startTime: 0,
        endTime: 0,
        resultCount: 0,
        arrivalTimes: [],
        isQueryRunning: false,
    });
    const [uiMetrics, setUiMetrics] = useState(metricsRef.current);
    // --- GLOBAL QUERY STREAM REGISTRY (Supports Arrays) ---
    // Stores an array of active stream objects to support parallel sub-queries
    const activeQueryStreamRef = useRef([]);
    const activeLoadingSetter = useRef(null);
    // Pages call this when they create streams. Accepts an array.
    const registerQueryStream = useCallback((streams, setIsLoading) => {
        // 1. Safety check: Cleanup any PREVIOUS streams running before overwriting
        if (activeQueryStreamRef.current.length > 0) {
            activeQueryStreamRef.current.forEach(s => {
                try {
                    s.destroy();
                }
                catch (e) {
                    console.error("Error auto-closing old stream", e);
                }
            });
        }
        // 2. Register new
        activeQueryStreamRef.current = streams;
        activeLoadingSetter.current = setIsLoading;
    }, []);
    // The Stop Button Handler
    const stopActiveQuery = useCallback(() => {
        if (activeQueryStreamRef.current.length > 0) {
            console.log("🛑 Global Stop requested. Destroying streams:", activeQueryStreamRef.current.length);
            // Destroy all registered streams
            activeQueryStreamRef.current.forEach(stream => {
                try {
                    stream.destroy();
                }
                catch (e) {
                    console.error("Error destroying stream:", e);
                }
            });
            activeQueryStreamRef.current = [];
            if (activeLoadingSetter.current) {
                activeLoadingSetter.current(false);
            }
            // Force update metrics to stopped state
            const now = performance.now();
            metricsRef.current.isQueryRunning = false;
            metricsRef.current.endTime = now;
            setUiMetrics({ ...metricsRef.current });
        }
    }, []);
    // --- HANDLERS ---
    // 1. START HANDLER (Sets Running = true)
    const handleQueryStart = useCallback(() => {
        const now = performance.now();
        metricsRef.current = {
            startTime: now,
            endTime: 0,
            resultCount: 0,
            arrivalTimes: [],
            isQueryRunning: true, // Start Timer
        };
        setUiMetrics({ ...metricsRef.current });
    }, []);
    // 2. RESET HANDLER (Sets Running = false, resets to 0)
    const handleResetMetrics = useCallback(() => {
        // Kill streams if resetting view/navigating
        if (activeQueryStreamRef.current.length > 0) {
            activeQueryStreamRef.current.forEach(s => { try {
                s.destroy();
            }
            catch (e) { } });
            activeQueryStreamRef.current = [];
        }
        metricsRef.current = {
            startTime: 0,
            endTime: 0,
            resultCount: 0,
            arrivalTimes: [],
            isQueryRunning: false, // Idle
        };
        setUiMetrics({ ...metricsRef.current });
    }, []);
    const handleResultArrival = useCallback(() => {
        const now = performance.now();
        const metrics = metricsRef.current;
        metrics.resultCount++;
        metrics.arrivalTimes.push(now - metrics.startTime);
        // Immediate UI Update (No Throttling)
        setUiMetrics({ ...metrics });
    }, []);
    const handleQueryEnd = useCallback(() => {
        const metrics = metricsRef.current;
        metrics.isQueryRunning = false;
        metrics.endTime = performance.now();
        activeQueryStreamRef.current = []; // Clear stream registry
        // Final UI Update
        setUiMetrics({ ...metrics });
    }, []);
    // --- RESET HANDLER ---
    const handleSetQuery = useCallback((query) => {
        setCurrentQuery(query);
        setLogs([]);
        setTopologyStats(null);
        setTopologyProcessor(null);
        handleResetMetrics();
    }, [handleResetMetrics]);
    const createTopologyTracker = useCallback(() => {
        if (!isTrackingEnabled)
            return null;
        const trackerDiscovery = new StatisticLinkDiscovery();
        const trackerDereference = new StatisticLinkDereference();
        const tracker = new StatisticTraversalTopology(trackerDiscovery, trackerDereference);
        const processor = new UpdateProcessor(tracker);
        setTopologyProcessor(processor);
        let lastStatsUpdate = 0;
        tracker.on((data) => {
            const now = Date.now();
            if (now - lastStatsUpdate > 200) {
                setTopologyStats(data);
                lastStatsUpdate = now;
            }
        });
        return { trackerDiscovery, trackerDereference };
    }, [isTrackingEnabled]);
    return (_jsx(AuthProvider, { children: _jsxs(Router, { children: [_jsxs("nav", { style: {
                        padding: '0.75rem 2rem',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: [_jsx(Link, { to: "/", style: { fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', fontSize: '1.2rem' }, children: "\uD83E\uDDEA SolidLab" }), _jsx(Link, { to: "/profile", style: { textDecoration: 'none', color: '#444', fontSize: '0.9rem' }, children: "My Profile" })] }), _jsxs("div", { style: { display: 'flex', gap: '20px', alignItems: 'center' }, children: [uiMetrics.isQueryRunning && (_jsxs("button", { onClick: stopActiveQuery, style: {
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                                    }, children: [_jsx("span", { children: "\u23F9" }), " Stop Query"] })), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b' }, children: [_jsx("input", { type: "checkbox", checked: isTrackingEnabled, onChange: () => setIsTrackingEnabled(!isTrackingEnabled) }), isTrackingEnabled ? 'Tracking Active' : 'Tracking Paused'] }), _jsx(UserStatus, {}), _jsx("button", { style: {
                                        background: isDebugOpen ? '#475569' : '#0ea5e9',
                                        color: 'white',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                    }, onClick: () => setDebugOpen(!isDebugOpen), children: isDebugOpen ? '✕ Hide Traversal' : '👁️ Show Traversal' })] })] }), _jsxs("div", { style: { display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }, children: [_jsx("main", { style: {
                                flex: isDebugOpen ? 4 : 1,
                                background: '#f8fafc',
                                overflowY: 'auto',
                                transition: 'flex 0.4s ease-in-out',
                                borderRight: isDebugOpen ? '1px solid #e2e8f0' : 'none',
                                minWidth: isDebugOpen ? '300px' : '100%'
                            }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined, createTracker: createTopologyTracker, onQueryStart: handleQueryStart, onQueryEnd: handleQueryEnd, onResultArrived: handleResultArrival, registerQuery: registerQueryStream }) }), _jsx(Route, { path: "/forums/:id", element: _jsx(ForumDetail, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined, createTracker: createTopologyTracker, onQueryStart: handleQueryStart, onQueryEnd: handleQueryEnd, onResultArrived: handleResultArrival, registerQuery: registerQueryStream }) }), _jsx(Route, { path: "/profiles/:id", element: _jsx(UserProfileDetail, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined, createTracker: createTopologyTracker, onQueryStart: handleQueryStart, onQueryEnd: handleQueryEnd, onResultArrived: handleResultArrival, registerQuery: registerQueryStream }) }), _jsx(Route, { path: "*", element: _jsx("div", { style: { padding: '2rem' }, children: _jsx("h2", { children: "404" }) }) })] }) }), _jsx("aside", { style: {
                                flex: isDebugOpen ? 6 : 0,
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#fff',
                                transition: 'flex 0.4s ease-in-out',
                                overflow: 'hidden',
                                visibility: isDebugOpen ? 'visible' : 'hidden'
                            }, children: _jsx("div", { style: { minWidth: '50vw', height: '100%' }, children: _jsx(QueryDebugger, { isOpen: isDebugOpen, onClose: () => setDebugOpen(false), currentQuery: currentQuery, isTrackingEnabled: isTrackingEnabled, topology: topologyStats, processor: topologyProcessor, logs: logs, 
                                    // --- PASS METRICS DATA ---
                                    metrics: uiMetrics }) }) })] })] }) }));
};
export default App;
//# sourceMappingURL=App.js.map