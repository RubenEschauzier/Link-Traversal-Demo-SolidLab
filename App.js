import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Profile } from './src/pages/MyProfile.js';
import { ForumDetail } from './src/pages/ForumDetail.js';
import { UserProfileDetail } from './src/pages/ProfileDetail.js'; // New Component
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
/**

 * This demo still needs as system: Authentication via Solid Auth Client (or mocked implementation)

 * Possible issue: Currently the URI depends only on the id. A state is passed when navigating to
   set the seed query. When you then refresh this state is lost and we can't find the data anymore.

 * This demo will show:

 * My profile with some information of the logged-in user (check)

 * A list of my friends with their names and locations (check) and a clickable link towards another friend

 * A list of forums I like and the number of members in this forum (check)

 * Click on forum to see the messages + author (check)

 * TODO: Friday
 * An option to enable topology tracking (using own published package)

 * A panel that shows the query and the current logger output next to the visualized topology

 */
const UserStatus = () => {
    const { user, login, logout } = useAuth();
    if (user) {
        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("span", { children: ["Welcome, ", _jsx("strong", { children: user.name })] }), _jsx("button", { onClick: logout, style: { fontSize: '0.8rem' }, children: "Logout" })] }));
    }
    return (_jsx("button", { onClick: () => login({
            id: '1',
            username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
            name: 'Solid Developer Test'
        }), style: { background: '#4CAF50', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }, children: "Fake Login" }));
};
const App = () => {
    const [isDebugOpen, setDebugOpen] = useState(false);
    const [currentQuery, setCurrentQuery] = useState("No query executed yet.");
    return (_jsx(AuthProvider, { children: _jsxs(Router, { children: [_jsxs("nav", { style: {
                        padding: '1rem 2rem',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: [_jsx(Link, { to: "/", style: { fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', fontSize: '1.2rem' }, children: "\uD83E\uDDEA SolidLab" }), _jsx("div", { style: { display: 'flex', gap: '15px' }, children: _jsx(Link, { to: "/profile", style: { textDecoration: 'none', color: '#444' }, children: "My Profile" }) })] }), _jsxs("div", { style: { display: 'flex', gap: '10px', alignItems: 'center' }, children: [_jsx(UserStatus, {}), _jsxs("button", { style: {
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '5px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }, onClick: () => setDebugOpen(true), children: ["\uD83D\uDC41\uFE0F ", _jsx("span", { style: { fontSize: '0.85rem' }, children: "Debug Traversal" })] })] })] }), _jsx("div", { style: { minHeight: 'calc(100vh - 70px)', background: '#f8fafc' }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/profile", element: _jsx(Profile, { setDebugQuery: setCurrentQuery }) }), _jsx(Route, { path: "/forums/:id", element: _jsx(ForumDetail, { setDebugQuery: setCurrentQuery }) }), _jsx(Route, { path: "/profiles/:id", element: _jsx(UserProfileDetail, { setDebugQuery: setCurrentQuery }) }), _jsx(Route, { path: "*", element: _jsx("div", { style: { padding: '2rem' }, children: _jsx("h2", { children: "404: Not Found" }) }) })] }) }), _jsx(QueryDebugger, { isOpen: isDebugOpen, onClose: () => setDebugOpen(false), currentQuery: currentQuery, logs: [] })] }) }));
};
export default App;
//# sourceMappingURL=App.js.map