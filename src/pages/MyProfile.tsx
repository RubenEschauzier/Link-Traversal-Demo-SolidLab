import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you are using React Router for navigation
import { executeTraversalQuery } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import type { BindingsStream } from '@comunica/types';
import '../index.css'; 

// --- Data Interfaces ---

// 1. Profile Information Interface
interface UserProfile {
  name: string;
  lastName: string;
  gender: string;
  birthday: string;
  creationDate: Date;
  locationIP: string;
  city: string;
  email: string;
  interests: string[];
}

// 2. Forum Interface
interface Forum {
  id: string;
  title: string;
  memberCount: number;
}

// 3. Friend Interface
interface Friend {
  id: string;
  name: string;
  mutualFriends: number;
}

// --- Props Interface ---
interface ProfileProps {
  setDebugQuery: (query: string) => void;
}

// --- SPARQL Query Constants ---
const QUERY_MY_INFO = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT ?firstName ?lastName ?birthday ?locationIP ?browserUsed ?cityName ?gender ?creationDate ?email ?interestName WHERE {
    TEMPLATE:ME rdf:type snvoc:Person;
      snvoc:firstName ?firstName;
      snvoc:lastName ?lastName;
      snvoc:gender ?gender;
      snvoc:birthday ?birthday;
      snvoc:creationDate ?creationDate;
      snvoc:locationIP ?locationIP;
      snvoc:isLocatedIn ?city;
      snvoc:email ?email;
      snvoc:hasInterest ?interest.
    ?interest foaf:name ?interestName.
    ?city foaf:name ?cityName.
  }
`;


const processProfileBinding = (binding: any, accumulatingValues: Record<string, string[]>): UserProfile => {
  if (!accumulatingValues['email']) {
    accumulatingValues['email'] = [];
  }
  if (!accumulatingValues['email'].includes(binding.get('email').value)){
    accumulatingValues['email'].push(binding.get('email').value);
  }
  if (!accumulatingValues['interests']) {
    accumulatingValues['interests'] = [];
  }
  if (!accumulatingValues['interests'].includes(binding.get('interestName').value)){
    accumulatingValues['interests'].push(binding.get('interestName').value);
  }
  return {
    name: binding.get('firstName').value,
    lastName: binding.get('lastName').value,
    gender: binding.get('gender').value,
    birthday: binding.get('birthday').value,
    creationDate: new Date(binding.get('creationDate').value),
    locationIP: binding.get('locationIP').value,
    city: binding.get('cityName').value,
    email: accumulatingValues['email'].join(', '),
    interests: accumulatingValues['interests']
  };
}
export const Profile: React.FC<ProfileProps> = ({ setDebugQuery }) => {
  const { user, isAuthenticated } = useAuth();
  // State for the different data sections
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Toggle state to show/hide sections
  const [activeSection, setActiveSection] = useState<'info' | 'forums' | 'friends' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Access Denied</h2>
        <p>Please click "Fake Login" in the top right corner.</p>
      </div>
    );
  }

  const loadProfileInfo = async () => {
    setIsLoading(true);
    setActiveSection('info');

    // Clear old data and ensure the UI shows a loading state
    setProfileData(null);

    const infoQuery = QUERY_MY_INFO.replaceAll('TEMPLATE:ME', `<${user.username}>`);
    console.log(infoQuery)
    setDebugQuery(infoQuery);
    
    try {
      // In a real app, you would parse the result here. 
      // We assume the stub returns the correct shape or we cast it.
      const bs: BindingsStream = await executeTraversalQuery(infoQuery, {});
      const accumulatingValues: Record<string, string[]> = {};
      bs.on('data', (binding) => {
        const profileData = processProfileBinding(binding, accumulatingValues);
        setProfileData(profileData);
      });
      await new Promise<void>((resolve, reject) => {
        bs.on('end', resolve); // Resolve the promise when the stream ends
        bs.on('error', reject); // Reject if there's a stream error
      });
      // const data = {
      //   username: user.name,
      //   bio: "This is a mock bio loaded from the decentralized web.",
      //   joinDate: "2022-01-15",
      //   avatarUrl: user.avatar || undefined
      // }
      // // Mocking the cast for the stub return value
      // // If executeTraversalQuery returns an array, we take the first item
      // setProfileData(Array.isArray(data) ? data[0] : data); 
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  // const loadForums = async () => {
  //   setIsLoading(true);
  //   setActiveSection('forums');
  //   setDebugQuery(QUERY_MY_FORUMS);

  //   try {
  //     const data = (await executeTraversalQuery(QUERY_MY_FORUMS, {})) as Forum[];
  //     setForums(data);
  //   } catch (error) {
  //     console.error("Failed to load forums", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // const loadFriends = async () => {
  //   setIsLoading(true);
  //   setActiveSection('friends');
  //   setDebugQuery(QUERY_MY_FRIENDS);

  //   try {
  //     const data = (await executeTraversalQuery(QUERY_MY_FRIENDS, {})) as Friend[];
  //     setFriends(data);
  //   } catch (error) {
  //     console.error("Failed to load friends", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

return (
  <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
    
    {/* 1. Modern Header Section */}
    <div className="dashboard-header">
      <h1 className="dashboard-title">Welcome back, {user.name} 👋</h1>
      <div className="user-badge">
        <span>ID: {user.username}</span>
      </div>
    </div>

    {/* 2. Action Buttons */}
    <div className="action-bar">
      <button 
        className="btn-primary" 
        onClick={loadProfileInfo} 
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : '📄 Load Profile Data'}
      </button>

      {/* Commented out buttons kept as requested, but styled for future use */}
      {/* <button className="btn-primary" onClick={loadForums} disabled={isLoading}>
        💬 Show My Forums
      </button>
      <button className="btn-primary" onClick={loadFriends} disabled={isLoading}>
        👥 Show Friends
      </button> 
      */}
    </div>

    {/* 3. Main Content Area */}
    {/* We use 'min-height' to prevent the page from jumping around */}
    <div style={{ minHeight: '300px' }}>
      
      {/* A. Loading State */}
      {isLoading && (
        <div className="card content-placeholder">
          <div className="loading-pulse">
            {/* Simple CSS Spinner */}
            <div style={{
              width: '20px', height: '20px', 
              border: '3px solid #e2e8f0', borderTopColor: '#2563eb', 
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <span>Traversing the decentralized web...</span>
          </div>
          {/* Inline style for the keyframes to work without external CSS file if needed */}
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* B. Empty State (When not loading and no data yet) */}
      {!isLoading && !activeSection && (
        <div className="card content-placeholder">
          <h3>No data loaded yet</h3>
          <p>Click the "Load Profile Data" button above to fetch your decentralized identity.</p>
        </div>
      )}
      {!isLoading && activeSection === 'info' && profileData && (
      <div className="profile-container">
        
        {/* === LEFT COLUMN === */}
        <div className="card profile-column-left">
          <div className="profile-header">
            {(
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>👤</div>
            )}
            
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#2c3e50' }}>
                {profileData.name} {profileData.lastName}
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#666' }}>
                📍 {profileData.city || 'Unknown Location'}
              </p>
            </div>
          </div>

          <div className="metadata-grid">
            <div>
              <div className="meta-label">Gender</div>
              <div className="meta-value">{profileData.gender}</div>
            </div>
            <div>
              <div className="meta-label">Birthday</div>
              <div className="meta-value">{profileData.birthday}</div>
            </div>
            <div>
              <div className="meta-label">Member Since</div>
              <div className="meta-value">
                {new Date(profileData.creationDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="meta-label">IP Address</div>
              <div className="meta-value">{profileData.locationIP}</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="meta-label">Email Address</div>
              <div className="meta-value">{profileData.email}</div>
            </div>
          </div>
        </div>

          {/* === RIGHT COLUMN === */}
          <div className="card profile-column-right">
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              ❤️ Interests
            </h3>
            
            <div className="scroll-area">
              {profileData.interests && profileData.interests.length > 0 ? (
                <div>
                  {profileData.interests.map((interest, index) => (
                    <span key={index} className="interest-chip">
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic' }}>No interests listed.</p>
              )}
            </div>
          </div>

        </div>
        )}
        {!isLoading && activeSection === 'forums' && (
          <div className="forums-list">
            <h3>Subscribed Forums</h3>
            {forums.length === 0 ? <p>No forums found.</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {forums.map((forum) => (
                  <li key={forum.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <strong>{forum.title}</strong>
                    <span style={{ float: 'right', color: '#888' }}>{forum.memberCount} Members</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeSection === 'friends' && (
          <div className="friends-list">
            <h3>Friends Network</h3>
            {friends.length === 0 ? <p>No friends found.</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {friends.map((friend) => (
                  <div key={friend.id} style={{ padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}>
                    <strong>{friend.name}</strong>
                    <p style={{ fontSize: '0.8em', color: '#666' }}>{friend.mutualFriends} Mutuals</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && !activeSection && (
          <p style={{ color: '#888', textAlign: 'center' }}>Select an action above to query your profile data.</p>
        )}
      </div>
    </div>
  );
};