import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
// All page components must also be .tsx now
import { Profile } from './src/pages/MyProfile.js';
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';
// Create a small "UserStatus" component for the Navbar
const UserStatus = () => {
    const { user, login, logout } = useAuth();
    if (user) {
        return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsxs("span", { children: ["Welcome, ", _jsx("strong", { children: user.name })] }), _jsx("button", { onClick: logout, style: { fontSize: '0.8rem' }, children: "Logout" })] }));
    }
    // Mock "Login" Button
    return (_jsx("button", { onClick: () => login({
            id: '1',
            username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
            name: 'Solid Developer Test'
        }), style: { background: '#4CAF50', color: 'white' }, children: "Fake Login" }));
};
// Define the type for the App component. React.FC is standard for Function Components.
const App = () => {
    // TypeScript infers isDebugOpen is boolean and setDebugOpen is Dispatch<SetStateAction<boolean>>
    const [isDebugOpen, setDebugOpen] = useState(false);
    // TypeScript infers currentQuery is string and setCurrentQuery is Dispatch<SetStateAction<string>>
    const [currentQuery, setCurrentQuery] = useState("No query executed yet.");
    return (_jsx(AuthProvider, { children: _jsxs(Router, { children: [_jsxs("nav", { style: { padding: '1rem', background: '#eee', display: 'flex', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx(Link, { to: "/", style: { marginRight: 10 }, children: "My Feed" }), _jsx(Link, { to: "/profile", style: { marginRight: 10 }, children: "Profile" })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx(UserStatus, {}), " ", _jsx("button", { style: { background: 'red', color: 'white' }, onClick: () => setDebugOpen(true), children: "\uD83D\uDC41\uFE0F Show Traversal" })] })] }), _jsx("div", { style: { padding: '2rem' }, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx("div", { children: "Welcome to the My Feed page. (Content not implemented)" }) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, { setDebugQuery: setCurrentQuery }) })] }) }), _jsx(QueryDebugger, { isOpen: isDebugOpen, onClose: () => setDebugOpen(false), currentQuery: currentQuery, 
                    // NOTE: QueryDebugger also requires a 'logs' prop (likely an empty array) 
                    // based on the interface defined in its TSX conversion.
                    logs: [] })] }) }));
};
export default App;
//# sourceMappingURL=App.js.map