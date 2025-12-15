import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
// All page components must also be .tsx now
import { Profile } from './src/pages/MyProfile.js';
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';

/**
 * This demo still needs as system: Authentication via Solid Auth Client (or mocked implementation)
 * This demo will show:
 * My profile with some information of the logged-in user (check)
 * A list of my friends with their names and locations
 * A list of forums I like and the messages in these forums
 * Click on these messages to see:
 *  The authors of these messages and their information.
 *  The comments under these messages
 * A panel that shows atleast the query and for example the current logger output
 * Optionally we include the traversal topology visualization as well if feasible due to LLMs
 */

// Create a small "UserStatus" component for the Navbar
const UserStatus = () => {
  const { user, login, logout } = useAuth();

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>Welcome, <strong>{user.name}</strong></span>
        <button onClick={logout} style={{ fontSize: '0.8rem' }}>Logout</button>
      </div>
    );
  }

  // Mock "Login" Button
  return (
    <button 
      onClick={() => login(
        {
          id: '1',
          username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
           name: 'Solid Developer Test' 
          }
        )}
      style={{ background: '#4CAF50', color: 'white' }}
    >
      Fake Login
    </button>
  );
};

// Define the type for the App component. React.FC is standard for Function Components.
const App: React.FC = () => {
  // TypeScript infers isDebugOpen is boolean and setDebugOpen is Dispatch<SetStateAction<boolean>>
  const [isDebugOpen, setDebugOpen] = useState(false); 
  
  // TypeScript infers currentQuery is string and setCurrentQuery is Dispatch<SetStateAction<string>>
  const [currentQuery, setCurrentQuery] = useState("No query executed yet.");

  return (
    <AuthProvider>
      <Router>
        <nav style={{ padding: '1rem', background: '#eee', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Link to="/" style={{ marginRight: 10 }}>My Feed</Link>
            <Link to="/profile" style={{ marginRight: 10 }}>Profile</Link>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <UserStatus /> {/* <--- New Component handles auth display */}
            <button 
              style={{ background: 'red', color: 'white' }} 
              onClick={() => setDebugOpen(true)}
            >
              👁️ Show Traversal
            </button>
          </div>        
        </nav>

        <div style={{ padding: '2rem' }}>
          <Routes>
            {/* The setDebugQuery prop needs to match the required type signature, 
              which is (query: string) => void, defined by the page components' props.
            */}
            <Route path="/" element={<div>Welcome to the My Feed page. (Content not implemented)</div>} />
            <Route path="/profile" element={<Profile setDebugQuery={setCurrentQuery} />} />
          </Routes>
        </div>

        <QueryDebugger 
          isOpen={isDebugOpen} 
          onClose={() => setDebugOpen(false)} 
          currentQuery={currentQuery} 
          // NOTE: QueryDebugger also requires a 'logs' prop (likely an empty array) 
          // based on the interface defined in its TSX conversion.
          logs={[]} 
        />
      </Router>
    </AuthProvider>
  );
};

export default App;