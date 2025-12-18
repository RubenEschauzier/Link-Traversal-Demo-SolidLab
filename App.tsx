import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Profile } from './src/pages/MyProfile.js';
import { ForumDetail } from './src/pages/ForumDetail.js';
import { UserProfileDetail } from './src/pages/ProfileDetail.js'; // New Component
import QueryDebugger from './src/components/QueryDebugger.js';
import { AuthProvider, useAuth } from './src/context/AuthContext.js';


/**

 * This demo still needs as system: Authentication via Solid Auth Client (or mocked implementation)

 * Possible issue: 
  - Currently the URI depends only on the id. A state is passed when navigating to 
  set the seed query. When you then refresh this state is lost and we can't find the data anymore.

  - Finding friends is very slow! We should think about how to improve or what story to tell.
  I found that the same query is a lot more 'streaming' and faster with adaptive query processing.

 * This demo will show:

 * My profile with some information of the logged-in user 

 * A list of my friends with their names and locations  and a clickable link towards another friend 

 * A list of forums I like and the number of members in this forum 

 * Click on forum to see the messages + author 

 * TODO: Friday
 * An option to enable topology tracking (using own published package)

 * A panel that shows the query and the current logger output next to the visualized topology

 */ 

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

  return (
    <button 
      onClick={() => login({
          id: '1',
          username: 'https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me',
          name: 'Solid Developer Test' 
      })}
      style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}
    >
      Fake Login
    </button>
  );
};

const App: React.FC = () => {
  const [isDebugOpen, setDebugOpen] = useState(false); 
  const [currentQuery, setCurrentQuery] = useState("No query executed yet.");

  return (
    <AuthProvider>
      <Router>
        {/* Navigation Bar */}
        <nav style={{ 
          padding: '1rem 2rem', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/" style={{ fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', fontSize: '1.2rem' }}>
              🧪 SolidLab
            </Link>
            <div style={{ display: 'flex', gap: '15px' }}>
              <Link to="/profile" style={{ textDecoration: 'none', color: '#444' }}>My Profile</Link>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <UserStatus />
            <button 
              style={{ 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                padding: '5px 12px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }} 
              onClick={() => setDebugOpen(true)}
            >
              👁️ <span style={{ fontSize: '0.85rem' }}>Debug Traversal</span>
            </button>
          </div>        
        </nav>

        {/* Main Content Area */}
        <div style={{ minHeight: 'calc(100vh - 70px)', background: '#f8fafc' }}>
          <Routes>            
            {/* 2. Logged-in Personal Profile */}
            <Route path="/profile" element={<Profile setDebugQuery={setCurrentQuery} />} />
            
            {/* 3. Forum Detail (Linked from Profile) */}
            <Route path="/forums/:id" element={<ForumDetail setDebugQuery={setCurrentQuery}/>} />
            
            {/* 4. Public Profiles (Linked from Friends or Forum Messages) */}
            <Route path="/profiles/:id" element={<UserProfileDetail setDebugQuery={setCurrentQuery} />} />
            
            {/* Fallback */}
            <Route path="*" element={<div style={{ padding: '2rem' }}><h2>404: Not Found</h2></div>} />
          </Routes>
        </div>

        {/* The Debugger Overlay */}
        <QueryDebugger 
          isOpen={isDebugOpen} 
          onClose={() => setDebugOpen(false)} 
          currentQuery={currentQuery} 
          logs={[]} 
        />
      </Router>
    </AuthProvider>
  );
};

export default App;