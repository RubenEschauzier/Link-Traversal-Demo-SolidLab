import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { executeTraversalQuery, ReactTraversalLogger } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import type { BindingsStream } from '@comunica/types';
import '../index.css'; 

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

interface ProfileProps {
  setDebugQuery: (query: string) => void;
  logger: ReactTraversalLogger | undefined;
}


const QUERY_PERSON_INFO = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT ?firstName ?lastName ?birthday ?locationIP ?cityName ?gender ?creationDate ?email ?interestName WHERE {
    <TEMPLATE:URI> rdf:type snvoc:Person;
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

const processProfileBinding = (binding: any, prev: UserProfile | null): UserProfile => {
  const email = binding.get('email').value;
  const interest = binding.get('interestName').value;

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

  const updatedInterests = prev.interests.includes(interest) ? prev.interests : [...prev.interests, interest];
  const updatedEmails = prev.email.includes(email) ? prev.email : `${prev.email}, ${email}`;

  return { ...prev, interests: updatedInterests, email: updatedEmails };
};

export const UserProfileDetail: React.FC<ProfileProps> = ({ setDebugQuery, logger }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const activeStream = useRef<BindingsStream | null>(null);
  const { isAuthenticated } = useAuth();

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stopQuery = () => {
    if (activeStream.current) {
      activeStream.current.destroy();
      activeStream.current = null;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      setIsLoading(true);
      stopQuery();

      let targetUri = location.state?.personUri;

    //   // Step 1: Discovery Phase (If URI wasn't passed via state)
    //   if (!targetUri) {
    //     const findQuery = QUERY_FIND_PERSON_BY_ID.replace('TEMPLATE:ID', id);
    //     try {
    //       const bs: BindingsStream = await executeTraversalQuery(findQuery, {}, 2);
    //       await new Promise<void>((resolve) => {
    //         bs.on('data', (binding) => {
    //           targetUri = binding.get('person').value;
    //           resolve();
    //         });
    //         bs.on('end', resolve);
    //       });
    //     } catch (e) { console.error("Discovery failed", e); }
    //   }

      if (!targetUri) {
        setIsLoading(false);
        return;
      }

      // Step 2: Data Retrieval Phase
      const infoQuery = QUERY_PERSON_INFO.replace('TEMPLATE:URI', targetUri);
      setDebugQuery(infoQuery);

      try {
        const bs: BindingsStream = await executeTraversalQuery(infoQuery, {log: logger }, 2);
        activeStream.current = bs;
        bs.on('data', (binding) => {
          setProfileData(prev => processProfileBinding(binding, prev));
          setIsLoading(false);
        });
        bs.on('end', () => setIsLoading(false));
      } catch (error) {
        console.error("Failed to load profile", error);
        setIsLoading(false);
      }
    };

    fetchUserData();
    return () => stopQuery();
  }, [id, location.state]);

  // if (!isAuthenticated) {
  //   return (
  //     <div className="card" style={{ margin: '40px auto', maxWidth: '500px', textAlign: 'center' }}>
  //       <h2>Access Denied</h2>
  //       <p>Please log in to view decentralized profiles.</p>
  //     </div>
  //   );
  // }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <button className="btn-primary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      {isLoading && !profileData ? (
        <div className="card content-placeholder">
          <div className="loading-pulse">
            <div className="spinner" />
            <span>Traversing pods to find {id}...</span>
          </div>
        </div>
      ) : profileData ? (
        <div className="profile-container">
          <div className="card profile-column-left">
            <div className="profile-header">
              <div className="avatar-circle" style={{ background: '#fef3c7', color: '#d97706' }}>👤</div>
              <div>
                <h2 style={{ margin: 0 }}>{profileData.name} {profileData.lastName}</h2>
                <p style={{ color: '#666' }}>📍 {profileData.city}</p>
                <small style={{ color: '#94a3b8' }}>Solid ID: {id}</small>
              </div>
            </div>
            
            <div className="metadata-grid">
              <div><div className="meta-label">Gender</div><div className="meta-value">{profileData.gender}</div></div>
              <div><div className="meta-label">Birthday</div><div className="meta-value">{profileData.birthday}</div></div>
              <div><div className="meta-label">Member Since</div><div className="meta-value">{profileData.creationDate.toLocaleDateString()}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><div className="meta-label">Email</div><div className="meta-value">{profileData.email}</div></div>
            </div>
          </div>

          <div className="card profile-column-right">
            <h3>❤️ Interests</h3>
            <div className="scroll-area">
              {profileData.interests.map((interest, i) => (
                <span key={i} className="interest-chip" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>User Not Found</h2>
          <p>The profile for "{id}" could not be resolved in the network.</p>
        </div>
      )}
    </div>
  );
};