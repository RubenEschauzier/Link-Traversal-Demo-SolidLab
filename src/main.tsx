// src/main.tsx (or index.tsx, adjust path in index.html accordingly)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './../App.js'; // Assumes your App.tsx is in the same directory

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
);