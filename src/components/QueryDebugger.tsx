import React, { type CSSProperties } from 'react';

// 1. Define the type for a single log entry
interface LogEntry {
  id: number;
  message: string;
  timestamp: string; // Or Date, depending on your actual log data
  level?: 'info' | 'warn' | 'error';
}

// 2. Define the Props interface for the component
interface QueryDebuggerProps {
  /** Flag to control the visibility of the modal. */
  isOpen: boolean;
  /** Callback function to close the modal. */
  onClose: () => void;
  /** The current SPARQL query string being executed. */
  currentQuery: string;
  /** Array of log entries to display in the log window. */
  logs: LogEntry[]; 
}

// Define component using the Props interface
const QueryDebugger: React.FC<QueryDebuggerProps> = ({ isOpen, onClose, currentQuery, logs }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>⛓️ Link Traversal Inspector</h2>
        <p><strong>Current Context:</strong> <a href="http://solidbench-server:3000/.../card#me">http://solidbench-server:3000/.../card#me</a></p>
        
        <h3>Executing SPARQL:</h3>
        <pre style={styles.codeBlock}>{currentQuery}</pre>

        <h3>Traversal Logs:</h3>
        <div style={styles.logWindow}>
          {/* Map over the structured 'logs' prop */}
          {logs.length > 0 ? (
            logs.map((log) => (
              // NOTE: Use a unique key for list items, assuming 'id' is unique
              <p key={log.id} style={{ color: log.level === 'error' ? 'red' : log.level === 'warn' ? 'yellow' : '#0f0' }}>
                [{log.timestamp}] {log.message}
              </p>
            ))
          ) : (
            // Displaying the original stub/placeholder text if the log array is empty
            <>
              {/* TODO: Bind this to your engine's event emitter to show HTTP requests in real-time */}
              <p>GET http://solidbench-server.../card#me [200 OK]</p>
              <p>Dereferencing snvoc:hasCreator...</p>
              <p>Found 15 candidate links...</p>
            </>
          )}
        </div>
        
        <button onClick={onClose}>Close Inspector</button>
      </div>
    </div>
  );
};

// Define the styles with explicit CSSProperties types for safety
const styles: { [key: string]: CSSProperties } = {
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