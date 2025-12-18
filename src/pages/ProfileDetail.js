import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { executeTraversalQuery } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import '../index.css';
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
const processProfileBinding = (binding, prev) => {
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
export const UserProfileDetail = ({ setDebugQuery }) => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const activeStream = useRef(null);
    const { isAuthenticated } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const stopQuery = () => {
        if (activeStream.current) {
            activeStream.current.destroy();
            activeStream.current = null;
        }
    };
    useEffect(() => {
        const fetchUserData = async () => {
            if (!id)
                return;
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
                const bs = await executeTraversalQuery(infoQuery, {}, 2);
                activeStream.current = bs;
                bs.on('data', (binding) => {
                    setProfileData(prev => processProfileBinding(binding, prev));
                    setIsLoading(false);
                });
                bs.on('end', () => setIsLoading(false));
            }
            catch (error) {
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
    return (_jsxs("div", { style: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }, children: [_jsx("button", { className: "btn-primary", onClick: () => navigate(-1), style: { marginBottom: '20px' }, children: "\u2190 Back" }), isLoading && !profileData ? (_jsx("div", { className: "card content-placeholder", children: _jsxs("div", { className: "loading-pulse", children: [_jsx("div", { className: "spinner" }), _jsxs("span", { children: ["Traversing pods to find ", id, "..."] })] }) })) : profileData ? (_jsxs("div", { className: "profile-container", children: [_jsxs("div", { className: "card profile-column-left", children: [_jsxs("div", { className: "profile-header", children: [_jsx("div", { className: "avatar-circle", style: { background: '#fef3c7', color: '#d97706' }, children: "\uD83D\uDC64" }), _jsxs("div", { children: [_jsxs("h2", { style: { margin: 0 }, children: [profileData.name, " ", profileData.lastName] }), _jsxs("p", { style: { color: '#666' }, children: ["\uD83D\uDCCD ", profileData.city] }), _jsxs("small", { style: { color: '#94a3b8' }, children: ["Solid ID: ", id] })] })] }), _jsxs("div", { className: "metadata-grid", children: [_jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Gender" }), _jsx("div", { className: "meta-value", children: profileData.gender })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Birthday" }), _jsx("div", { className: "meta-value", children: profileData.birthday })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Member Since" }), _jsx("div", { className: "meta-value", children: profileData.creationDate.toLocaleDateString() })] }), _jsxs("div", { style: { gridColumn: '1 / -1' }, children: [_jsx("div", { className: "meta-label", children: "Email" }), _jsx("div", { className: "meta-value", children: profileData.email })] })] })] }), _jsxs("div", { className: "card profile-column-right", children: [_jsx("h3", { children: "\u2764\uFE0F Interests" }), _jsx("div", { className: "scroll-area", children: profileData.interests.map((interest, i) => (_jsx("span", { className: "interest-chip", style: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }, children: interest }, i))) })] })] })) : (_jsxs("div", { className: "card", children: [_jsx("h2", { children: "User Not Found" }), _jsxs("p", { children: ["The profile for \"", id, "\" could not be resolved in the network."] })] }))] }));
};
//# sourceMappingURL=ProfileDetail.js.map