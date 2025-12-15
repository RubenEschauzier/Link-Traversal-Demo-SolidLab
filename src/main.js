import { jsx as _jsx } from "react/jsx-runtime";
// src/main.tsx (or index.tsx, adjust path in index.html accordingly)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './../App.js'; // Assumes your App.tsx is in the same directory
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map