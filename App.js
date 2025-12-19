import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Profile } from './src/pages/MyProfile.js';
import { ForumDetail } from './src/pages/ForumDetail.js';
import { UserProfileDetail } from './src/pages/ProfileDetail.js';
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
import { ReactTraversalLogger } from './src/api/queryEngineStub.js';
const UserStatus = () => {
    const { user, login, logout } = useAuth();
    if (user) {
        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("span", { style: { fontSize: '0.9rem' }, children: ["Welcome, ", _jsx("strong", { children: user.name })] }), _jsx("button", { onClick: logout, style: { fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer' }, children: "Logout" })] }));
    }
    return (_jsx("button", { onClick: () => login({
            id: '1',
            username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
            name: 'Solid Developer Test'
        }), style: { background: '#4CAF50', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }, children: "Fake Login" }));
};
const App = () => {
    const [isDebugOpen, setDebugOpen] = useState(() => {
        const saved = localStorage.getItem('solidlab_debug_sidebar_open');
        return saved !== null ? JSON.parse(saved) : false; // Default to false
    });
    useEffect(() => {
        localStorage.setItem('solidlab_debug_sidebar_open', JSON.stringify(isDebugOpen));
    }, [isDebugOpen]);
    const [currentQuery, setCurrentQuery] = useState("No query executed yet.");
    const [logs, setLogs] = useState([]);
    // Performance Toggle State
    const [isTrackingEnabled, setIsTrackingEnabled] = useState(() => {
        const saved = localStorage.getItem('solidlab_tracking_enabled');
        // If 'false' is stored, return false; otherwise default to true
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
    const handleNewLog = useCallback((entry) => {
        // We check the REF. This is always up-to-the-second accurate.
        if (isTrackingRef.current) {
            setLogs(prev => [...prev.slice(-5000), entry]);
        }
    }, []);
    const traversalLogger = useMemo(() => new ReactTraversalLogger('debug', handleNewLog), [handleNewLog]);
    // Wrapped setter: only updates state if tracking is on
    const handleSetQuery = useCallback((query) => {
        setCurrentQuery(query);
        setLogs([]);
    }, []);
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
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: [_jsx(Link, { to: "/", style: { fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', fontSize: '1.2rem' }, children: "\uD83E\uDDEA SolidLab" }), _jsx(Link, { to: "/profile", style: { textDecoration: 'none', color: '#444', fontSize: '0.9rem' }, children: "My Profile" })] }), _jsxs("div", { style: { display: 'flex', gap: '20px', alignItems: 'center' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b' }, children: [_jsx("input", { type: "checkbox", checked: isTrackingEnabled, onChange: () => setIsTrackingEnabled(!isTrackingEnabled) }), isTrackingEnabled ? '⚡ Tracking Active' : '⏸️ Tracking Paused'] }), _jsx(UserStatus, {}), _jsx("button", { style: {
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
                                    }, onClick: () => setDebugOpen(!isDebugOpen), children: isDebugOpen ? '✕ Hide Traversal' : '👁️ Show Traversal' })] })] }), _jsxs("div", { style: { display: 'flex', height: 'calc(100vh - 65px)', overflow: 'hidden' }, children: [_jsx("main", { style: {
                                // When open, take 4 parts of the space. When closed, take 100%.
                                flex: isDebugOpen ? 4 : 1,
                                background: '#f8fafc',
                                overflowY: 'auto',
                                transition: 'flex 0.4s ease-in-out',
                                borderRight: isDebugOpen ? '1px solid #e2e8f0' : 'none',
                                minWidth: isDebugOpen ? '300px' : '100%' // Prevents app from disappearing
                            }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/profile", element: _jsx(Profile, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined }) }), _jsx(Route, { path: "/forums/:id", element: _jsx(ForumDetail, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined }) }), _jsx(Route, { path: "/profiles/:id", element: _jsx(UserProfileDetail, { setDebugQuery: handleSetQuery, logger: isTrackingEnabled ? traversalLogger : undefined }) }), _jsx(Route, { path: "*", element: _jsx("div", { style: { padding: '2rem' }, children: _jsx("h2", { children: "404" }) }) })] }) }), _jsx("aside", { style: {
                                // When open, take 6 parts of the space. When closed, take 0.
                                flex: isDebugOpen ? 6 : 0,
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#fff',
                                transition: 'flex 0.4s ease-in-out',
                                overflow: 'hidden', // Crucial: prevents content from bleeding out during transition
                                visibility: isDebugOpen ? 'visible' : 'hidden'
                            }, children: _jsx("div", { style: { minWidth: '50vw', height: '100%' }, children: _jsx(QueryDebugger, { isOpen: isDebugOpen, onClose: () => setDebugOpen(false), currentQuery: currentQuery, isTrackingEnabled: isTrackingEnabled, logs: logs }) }) })] })] }) }));
};
export default App;
//# sourceMappingURL=App.js.map