import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, {} from 'react';
// Define component using the Props interface
const QueryDebugger = ({ isOpen, onClose, currentQuery, logs }) => {
    if (!isOpen)
        return null;
    return (_jsx("div", { style: styles.overlay, children: _jsxs("div", { style: styles.modal, children: [_jsx("h2", { children: "\u26D3\uFE0F Link Traversal Inspector" }), _jsxs("p", { children: [_jsx("strong", { children: "Current Context:" }), " ", _jsx("a", { href: "http://solidbench-server:3000/.../card#me", children: "http://solidbench-server:3000/.../card#me" })] }), _jsx("h3", { children: "Executing SPARQL:" }), _jsx("pre", { style: styles.codeBlock, children: currentQuery }), _jsx("h3", { children: "Traversal Logs:" }), _jsx("div", { style: styles.logWindow, children: logs.length > 0 ? (logs.map((log) => (
                    // NOTE: Use a unique key for list items, assuming 'id' is unique
                    _jsxs("p", { style: { color: log.level === 'error' ? 'red' : log.level === 'warn' ? 'yellow' : '#0f0' }, children: ["[", log.timestamp, "] ", log.message] }, log.id)))) : (
                    // Displaying the original stub/placeholder text if the log array is empty
                    _jsxs(_Fragment, { children: [_jsx("p", { children: "GET http://solidbench-server.../card#me [200 OK]" }), _jsx("p", { children: "Dereferencing snvoc:hasCreator..." }), _jsx("p", { children: "Found 15 candidate links..." })] })) }), _jsx("button", { onClick: onClose, children: "Close Inspector" })] }) }));
};
// Define the styles with explicit CSSProperties types for safety
const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modal: {
        background: 'white',
        padding: '20px',
        width: '80%',
        maxWidth: '800px',
        borderRadius: '8px'
    },
    codeBlock: {
        background: '#f4f4f4',
        padding: '10px',
        overflowX: 'auto',
        // Ensures text wrapping doesn't occur for long lines
        whiteSpace: 'pre',
    },
    logWindow: {
        height: '150px',
        overflowY: 'scroll',
        background: '#333',
        color: '#0f0',
        padding: '10px',
        fontFamily: 'monospace'
    }
};
export default QueryDebugger;
//# sourceMappingURL=QueryDebugger.js.map