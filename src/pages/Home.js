import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
export const Home = () => {
    const navigate = useNavigate();
    const { isAuthenticated, login } = useAuth();
    return (_jsxs("div", { style: {
            maxWidth: '900px',
            margin: '60px auto',
            padding: '0 20px',
            textAlign: 'center'
        }, children: [_jsxs("div", { className: "card", style: { padding: '60px 40px', borderBottom: '4px solid #2563eb' }, children: [_jsxs("h1", { style: { fontSize: '3rem', color: '#1e293b', marginBottom: '10px' }, children: ["SolidLab ", _jsx("span", { style: { color: '#2563eb' }, children: "Demo" })] }), _jsxs("p", { style: { fontSize: '1.25rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 30px auto' }, children: ["Experience the power of ", _jsx("strong", { children: "Link Traversal" }), " in a decentralized social network. No central database\u2014just a query engine following links across the web."] }), !isAuthenticated ? (_jsx("button", { className: "btn-primary", style: { padding: '12px 32px', fontSize: '1.1rem' }, children: "\uD83D\uDE80 Start Traversal Demo (Login)" })) : (_jsx("button", { className: "btn-primary", style: { padding: '12px 32px', fontSize: '1.1rem' }, onClick: () => navigate('/profile'), children: "\uD83D\uDCC2 Enter Dashboard" }))] }), _jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    marginTop: '40px'
                }, children: [_jsxs("div", { className: "card", style: { padding: '20px' }, children: [_jsx("div", { style: { fontSize: '2rem', marginBottom: '10px' }, children: "\uD83D\uDD0D" }), _jsx("h3", { style: { marginTop: 0 }, children: "Discover" }), _jsxs("p", { style: { color: '#64748b', fontSize: '0.95rem' }, children: ["The engine starts at your WebID and follows ", _jsx("code", { children: "foaf:knows" }), " links to find your friends' data."] })] }), _jsxs("div", { className: "card", style: { padding: '20px' }, children: [_jsx("div", { style: { fontSize: '2rem', marginBottom: '10px' }, children: "\uD83D\uDD17" }), _jsx("h3", { style: { marginTop: 0 }, children: "Traverse" }), _jsx("p", { style: { color: '#64748b', fontSize: '0.95rem' }, children: "Data is fetched live from multiple Pods. We don't \"own\" the data; we just browse the links." })] }), _jsxs("div", { className: "card", style: { padding: '20px' }, children: [_jsx("div", { style: { fontSize: '2rem', marginBottom: '10px' }, children: "\u26A1" }), _jsx("h3", { style: { marginTop: 0 }, children: "Stream" }), _jsx("p", { style: { color: '#64748b', fontSize: '0.95rem' }, children: "Results appear in the UI the moment they are found, thanks to reactive RDF streams." })] })] }), _jsx("div", { style: { marginTop: '50px' }, children: _jsx("p", { style: { color: '#94a3b8', fontStyle: 'italic', marginBottom: '20px' }, children: "How Link Traversal Query Processing (LTQP) works:" }) })] }));
};
//# sourceMappingURL=Home.js.map