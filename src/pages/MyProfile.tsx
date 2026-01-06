import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { executeTraversalQuery, ReactTraversalLogger } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import type { BindingsStream } from '@comunica/types';
import '../index.css'; 
import type { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import type { StatisticLinkDereference } from '@comunica/statistic-link-dereference';

// --- Data Interfaces ---
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

interface Forum {
  uri: string;
  id: string;
  title: string;
  memberCount: number;
}

interface Friend {
  firstName: string;
  lastName: string;
  city: string;
  friendCard: string;
  id: string;
}

interface ProfileProps {
  setDebugQuery: (query: string) => void;
  logger: ReactTraversalLogger | undefined;
  createTracker: () => {
    trackerDiscovery: StatisticLinkDiscovery;
    trackerDereference: StatisticLinkDereference;
  } | null;
  onQueryStart: () => void;
  onQueryEnd: () => void;
  onResultArrived: () => void;
  registerQuery: (stream: any[], setIsLoading: any) => void;
}

// --- SPARQL Queries ---
const QUERY_MY_FRIENDS = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT ?firstName ?lastName ?cityName ?friendProfile ?id WHERE {
    TEMPLATE:ME rdf:type snvoc:Person;
      snvoc:knows ?friend.
    ?friend snvoc:hasPerson ?friendProfile.
    ?friendProfile rdf:type snvoc:Person;
      snvoc:id ?id;
      snvoc:firstName ?firstName;
      snvoc:lastName ?lastName;
      snvoc:isLocatedIn ?city.
    ?city foaf:name ?cityName.
  }
`;

const QUERY_MY_INFO = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT ?firstName ?lastName ?birthday ?locationIP ?cityName ?gender ?creationDate ?email ?interestName WHERE {
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

const QUERY_MY_FORUMS = `
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT DISTINCT ?forum ?forumId ?forumTitle WHERE {
    ?message snvoc:hasCreator TEMPLATE:ME.
    ?forum snvoc:containerOf ?message;
      snvoc:id ?forumId;
      snvoc:title ?forumTitle.
  }
`;

const QUERY_MEMBER_COUNT = `
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT (COUNT(?member) AS ?count) WHERE {
    <FORUM_IRI> snvoc:hasMember ?member.
  }
`;

// --- Logic Helpers ---

const processProfileBinding = (binding: any, prev: UserProfile | null): UserProfile => {
  const email = binding.get('email').value;
  const interest = binding.get('interestName').value;

  // If we haven't started building the profile yet, create the base
  if (!prev) {
    return {
      name: binding.get('firstName').value,
      lastName: binding.get('lastName').value,
      gender: binding.get('gender').value,
      birthday: binding.get('birthday').value,
      creationDate: new Date(binding.get('creationDate').value),
      locationIP: binding.get('locationIP').value,
      city: binding.get('cityName').value,
      email: email,
      interests: [interest]
    };
  }

  // Accumulate unique interests and emails
  const updatedInterests = prev.interests.includes(interest) 
    ? prev.interests 
    : [...prev.interests, interest];
  
  const updatedEmails = prev.email.includes(email) 
    ? prev.email 
    : `${prev.email}, ${email}`;

  return { ...prev, interests: updatedInterests, email: updatedEmails };
};

export const Profile: React.FC<ProfileProps> = (  
  {
    setDebugQuery, 
    logger,
    createTracker,
    onQueryStart,
    onQueryEnd,
    onResultArrived, 
    registerQuery,
  }
) => {
  const activeStream = useRef<BindingsStream | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeSection, setActiveSection] = useState<'info' | 'forums' | 'friends' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stopQuery = () => {
    if (activeStream.current) {
      activeStream.current.destroy();
      activeStream.current = null;
    }
    // IMPORTANT: Clear the UI logs in the parent when we stop a query manually
    setDebugQuery(""); 
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopQuery();
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="card" style={{ margin: '40px auto', maxWidth: '500px', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  // --- Data Loaders ---

  const loadProfileInfo = async () => {
    stopQuery();
    setIsLoading(true);
    setActiveSection('info');
    setProfileData(null);

    const infoQuery = QUERY_MY_INFO.replaceAll('TEMPLATE:ME', `<${user.username}>`);
    setDebugQuery(infoQuery);
    
    try {
      const trackers = createTracker();
      let context = {log: logger};
      if (trackers){
        context = {
          ...context, 
          [trackers.trackerDiscovery.key.name]: trackers.trackerDiscovery,
          [trackers.trackerDereference.key.name]: trackers.trackerDereference,
        };
      }

      onQueryStart();
      const bs = await executeTraversalQuery(infoQuery, context, 2);
      registerQuery([bs], setIsLoading);
      activeStream.current = bs;

      bs.on('data', (binding: any) => {
        onResultArrived();
        setProfileData(prev => processProfileBinding(binding, prev));
        setIsLoading(false); 
      });

      bs.on('end', () => {
        setIsLoading(false)
        onQueryEnd();
      });
    } catch (error) {
      console.error("Failed to load profile", error);
      setIsLoading(false);
    }
  };

  const loadForums = async () => {
    stopQuery();
    setIsLoading(true);
    setActiveSection('forums');
    setForums([]);

    const forumsQuery = QUERY_MY_FORUMS.replaceAll('TEMPLATE:ME', `<${user.username}>`);
    setDebugQuery(forumsQuery + "\n\n" + QUERY_MEMBER_COUNT);

    try {
      const trackers = createTracker();
      let context = {log: logger};
      if (trackers){
        context = {
          ...context, 
          [trackers.trackerDiscovery.key.name]: trackers.trackerDiscovery,
          [trackers.trackerDereference.key.name]: trackers.trackerDereference,
        };
      }
      onQueryStart();
      const bs = await executeTraversalQuery(forumsQuery, context, undefined);
      registerQuery([bs], setIsLoading);

      activeStream.current = bs;

      bs.on('data', (binding: any) => {
        if (activeStream.current !== bs) return;
        onResultArrived();
        const forumIri = binding.get('forum').value;
        const newForum: Forum = { 
          uri: forumIri, 
          id: binding.get('forumId').value, 
          title: binding.get('forumTitle').value, 
          memberCount: -1 
        };

        setForums(prev => prev.some(f => f.uri === forumIri) ? prev : [...prev, newForum]);
        setIsLoading(false);
        // Background query for member count
        const countQuery = QUERY_MEMBER_COUNT.replace('FORUM_IRI', forumIri);
        executeTraversalQuery(countQuery, { traverse: false }, 2).then(countBs => {
          countBs.on('data', (countBinding: any) => {
            const count = parseInt(countBinding.get('count').value);
            setForums(curr => curr.map(f => f.uri === forumIri ? { ...f, memberCount: count } : f));
          });
        });
      });
      bs.on('end', () => {
        if (activeStream.current === bs){
          setIsLoading(false);
          onQueryEnd();
        }
      });    
    } catch (error) {
      console.error("Failed to load forums", error);
      setIsLoading(false);
    }
  };

  const loadFriends = async () => {
    stopQuery();
    setIsLoading(true);
    setActiveSection('friends');
    setFriends([]);

    const friendsQuery = QUERY_MY_FRIENDS.replaceAll('TEMPLATE:ME', `<${user.username}>`);
    setDebugQuery(friendsQuery);

    try {
      const trackers = createTracker();
      let context = {log: logger};
      if (trackers){
        context = {
          ...context, 
          [trackers.trackerDiscovery.key.name]: trackers.trackerDiscovery,
          [trackers.trackerDereference.key.name]: trackers.trackerDereference,
        };
      }
      onQueryStart();
      const bs = await executeTraversalQuery(friendsQuery, context, 2);
      activeStream.current = bs;
      registerQuery([bs], setIsLoading);

      bs.on('data', (binding: any) => {
        onResultArrived();
        const friendUri = binding.get('friendProfile').value;
        const newFriend: Friend = {
          firstName: binding.get('firstName').value,
          lastName: binding.get('lastName').value,
          city: binding.get('cityName').value,
          id: binding.get('id').value,
          friendCard: friendUri,
        };
        setFriends(prev => prev.some(f => f.friendCard === friendUri) ? prev : [...prev, newFriend]);
        setIsLoading(false);
      });

      bs.on('end', () => {
        setIsLoading(false);
        onQueryEnd();
      });
    } catch (error) {
      console.error("Failed to load friends", error);
      setIsLoading(false);
    }
  };

  // --- Main Render ---
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome back, {user.name} 👋</h1>
        <div className="user-badge"><span>ID: {user.username}</span></div>
      </div>

      <div className="action-bar">
        <button className="btn-primary" onClick={loadProfileInfo} disabled={isLoading}>
          {isLoading && activeSection === 'info' ? 'Loading...' : '📄 My Profile'}
        </button>
        <button className="btn-primary" onClick={loadFriends} disabled={isLoading}>
          {isLoading && activeSection === 'friends' ? 'Loading...' : '👥 Friends'}
        </button> 
        <button className="btn-primary" onClick={loadForums} disabled={isLoading}>
          {isLoading && activeSection === 'forums' ? 'Loading...' : '💬 Forums'}
        </button>
      </div>

      <div style={{ minHeight: '300px' }}>
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="card content-placeholder">
            <div className="loading-pulse">
              <div className="spinner" />
              <span>Traversing the decentralized web...</span>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!isLoading && activeSection === 'info' && profileData && (
          <div className="profile-container">
            <div className="card profile-column-left">
              <div className="profile-header">
                <div className="avatar-circle">👤</div>
                <div>
                  <h2 style={{ margin: 0 }}>{profileData.name} {profileData.lastName}</h2>
                  <p style={{ color: '#666' }}>📍 {profileData.city}</p>
                </div>
              </div>
              <div className="metadata-grid">
                <div><div className="meta-label">Gender</div><div className="meta-value">{profileData.gender}</div></div>
                <div><div className="meta-label">Birthday</div><div className="meta-value">{profileData.birthday}</div></div>
                <div><div className="meta-label">Member Since</div><div className="meta-value">{profileData.creationDate.toLocaleDateString()}</div></div>
                <div><div className="meta-label">IP Address</div><div className="meta-value">{profileData.locationIP}</div></div>
                <div style={{ gridColumn: '1 / -1' }}><div className="meta-label">Email</div><div className="meta-value">{profileData.email}</div></div>
              </div>
            </div>

            <div className="card profile-column-right">
              <h3>❤️ Interests</h3>
              <div className="scroll-area">
                {profileData.interests.map((interest, i) => (
                  <span key={i} className="interest-chip">{interest}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forums Section */}
        {!isLoading && activeSection === 'forums' && (
          <div className="card">
            <h2>My Forums ({forums.length})</h2>
            <div className="friends-grid">
              {forums.map((forum) => (
                <div key={forum.uri} className="friend-card">
                  <div className="friend-avatar-placeholder" style={{ background: '#e0e7ff' }}>💬</div>
                  <h3 className="friend-name">{forum.title}</h3>
                  <p className="friend-city">
                    {forum.memberCount === -1 ? "⏳ Counting..." : `👥 ${forum.memberCount} Members`}
                  </p>
                  <button className="btn-outline-sm"
                    onClick={() => navigate(`/forums/${forum.id}`, { state: { forumUri: forum.uri } })}
                  >
                    View Forum
                  </button>    
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends Section */}
        {!isLoading && activeSection === 'friends' && (
          <div className="card">
            <h2>Friends Network ({friends.length})</h2>
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.friendCard} className="friend-card">
                  <div className="friend-avatar-placeholder">{friend.firstName.charAt(0)}</div>
                  <h3 className="friend-name">{friend.firstName} {friend.lastName}</h3>
                  <p className="friend-city">📍 {friend.city}</p>
                  <button className="btn-outline-sm"
                    onClick={() => navigate(`/profiles/${friend.id}`, { state: { personUri: friend.friendCard } })}
                   >
                    View Profile</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};