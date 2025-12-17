import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you are using React Router for navigation
import { executeTraversalQuery } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import '../index.css';
// --- SPARQL Query Constants ---
const QUERY_MY_FRIENDS = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
  SELECT ?firstName ?lastName ?cityName ?friendProfile WHERE {
    TEMPLATE:ME rdf:type snvoc:Person;
      snvoc:knows ?friend.
    ?friend snvoc:hasPerson ?friendProfile.
    ?friendProfile rdf:type snvoc:Person;
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
const processProfileBinding = (binding, accumulatingValues) => {
    if (!accumulatingValues['email']) {
        accumulatingValues['email'] = [];
    }
    if (!accumulatingValues['email'].includes(binding.get('email').value)) {
        accumulatingValues['email'].push(binding.get('email').value);
    }
    if (!accumulatingValues['interests']) {
        accumulatingValues['interests'] = [];
    }
    if (!accumulatingValues['interests'].includes(binding.get('interestName').value)) {
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
};
const processFriendBinding = (binding, accumulatingValues) => {
    if (!accumulatingValues['firstName']) {
        accumulatingValues['firstName'] = [];
    }
    if (!accumulatingValues['firstName'].includes(binding.get('firstName').value)) {
        accumulatingValues['firstName'].push(binding.get('firstName').value);
    }
    if (!accumulatingValues['lastName']) {
        accumulatingValues['lastName'] = [];
    }
    if (!accumulatingValues['lastName'].includes(binding.get('lastName').value)) {
        accumulatingValues['lastName'].push(binding.get('lastName').value);
    }
    if (!accumulatingValues['city']) {
        accumulatingValues['city'] = [];
    }
    if (!accumulatingValues['city'].includes(binding.get('cityName').value)) {
        accumulatingValues['city'].push(binding.get('cityName').value);
    }
    if (!accumulatingValues['friendCard']) {
        accumulatingValues['friendCard'] = [];
    }
    if (!accumulatingValues['friendCard'].includes(binding.get('friendProfile').value)) {
        accumulatingValues['friendCard'].push(binding.get('friendProfile').value);
    }
    return accumulatingValues['firstName'].map((_, index) => ({
        firstName: accumulatingValues['firstName'][index],
        lastName: accumulatingValues['lastName'][index],
        city: accumulatingValues['city'][index],
        friendCard: accumulatingValues['friendCard'][index],
    }));
};
export const Profile = ({ setDebugQuery }) => {
    const { user, isAuthenticated } = useAuth();
    // State for the different data sections
    const [profileData, setProfileData] = useState(null);
    const [forums, setForums] = useState([]);
    const [friends, setFriends] = useState([]);
    // Toggle state to show/hide sections
    const [activeSection, setActiveSection] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    if (!isAuthenticated || !user) {
        return (_jsxs("div", { style: { padding: '20px' }, children: [_jsx("h2", { children: "Access Denied" }), _jsx("p", { children: "Please click \"Fake Login\" in the top right corner." })] }));
    }
    const loadProfileInfo = async () => {
        setIsLoading(true);
        setActiveSection('info');
        // Clear old data and ensure the UI shows a loading state
        setProfileData(null);
        const infoQuery = QUERY_MY_INFO.replaceAll('TEMPLATE:ME', `<${user.username}>`);
        console.log(infoQuery);
        setDebugQuery(infoQuery);
        try {
            // In a real app, you would parse the result here. 
            // We assume the stub returns the correct shape or we cast it.
            const bs = await executeTraversalQuery(infoQuery, {});
            const accumulatingValues = {};
            bs.on('data', (binding) => {
                const profileData = processProfileBinding(binding, accumulatingValues);
                setProfileData(profileData);
            });
            await new Promise((resolve, reject) => {
                bs.on('end', resolve); // Resolve the promise when the stream ends
                bs.on('error', reject); // Reject if there's a stream error
            });
        }
        catch (error) {
            console.error("Failed to load profile", error);
        }
        finally {
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
    const loadFriends = async () => {
        setIsLoading(true);
        setActiveSection('friends');
        // Clear old data and ensure the UI shows a loading state
        setProfileData(null);
        const friendsQuery = QUERY_MY_FRIENDS.replaceAll('TEMPLATE:ME', `<${user.username}>`);
        console.log(friendsQuery);
        setDebugQuery(friendsQuery);
        try {
            const bs = await executeTraversalQuery(friendsQuery, {});
            const accumulatingValues = {};
            bs.on('data', (binding) => {
                console.log("BINDING!!!");
                const profileData = processFriendBinding(binding, accumulatingValues);
                console.log(profileData);
                setFriends(profileData);
                setIsLoading(false);
            });
            await new Promise((resolve, reject) => {
                bs.on('end', resolve); // Resolve the promise when the stream ends
                bs.on('error', reject); // Reject if there's a stream error
            });
        }
        catch (error) {
            console.error("Failed to load friends", error);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { style: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }, children: [_jsxs("div", { className: "dashboard-header", children: [_jsxs("h1", { className: "dashboard-title", children: ["Welcome back, ", user.name, " \uD83D\uDC4B"] }), _jsx("div", { className: "user-badge", children: _jsxs("span", { children: ["ID: ", user.username] }) })] }), _jsxs("div", { className: "action-bar", children: [_jsx("button", { className: "btn-primary", onClick: loadProfileInfo, disabled: isLoading, children: isLoading ? 'Loading...' : '📄 Load Profile Data' }), _jsx("button", { className: "btn-primary", onClick: loadFriends, disabled: isLoading, children: isLoading ? 'Loading...' : '👥 Show Friends' })] }), _jsxs("div", { style: { minHeight: '300px' }, children: [isLoading && (_jsxs("div", { className: "card content-placeholder", children: [_jsxs("div", { className: "loading-pulse", children: [_jsx("div", { style: {
                                            width: '20px', height: '20px',
                                            border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                                            borderRadius: '50%', animation: 'spin 1s linear infinite'
                                        } }), _jsx("span", { children: "Traversing the decentralized web..." })] }), _jsx("style", { children: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` })] })), !isLoading && !activeSection && (_jsxs("div", { className: "card content-placeholder", children: [_jsx("h3", { children: "No data loaded yet" }), _jsx("p", { children: "Click the \"Load Profile Data\" button above to fetch your decentralized identity." })] })), !isLoading && activeSection === 'info' && profileData && (_jsxs("div", { className: "profile-container", children: [_jsxs("div", { className: "card profile-column-left", children: [_jsxs("div", { className: "profile-header", children: [(_jsx("div", { style: { width: '80px', height: '80px', borderRadius: '50%', background: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }, children: "\uD83D\uDC64" })), _jsxs("div", { children: [_jsxs("h2", { style: { margin: 0, fontSize: '1.8rem', color: '#2c3e50' }, children: [profileData.name, " ", profileData.lastName] }), _jsxs("p", { style: { margin: '5px 0 0 0', color: '#666' }, children: ["\uD83D\uDCCD ", profileData.city || 'Unknown Location'] })] })] }), _jsxs("div", { className: "metadata-grid", children: [_jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Gender" }), _jsx("div", { className: "meta-value", children: profileData.gender })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Birthday" }), _jsx("div", { className: "meta-value", children: profileData.birthday })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Member Since" }), _jsx("div", { className: "meta-value", children: new Date(profileData.creationDate).toLocaleDateString() })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "IP Address" }), _jsx("div", { className: "meta-value", children: profileData.locationIP })] }), _jsxs("div", { style: { gridColumn: '1 / -1' }, children: [_jsx("div", { className: "meta-label", children: "Email Address" }), _jsx("div", { className: "meta-value", children: profileData.email })] })] })] }), _jsxs("div", { className: "card profile-column-right", children: [_jsx("h3", { style: { marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }, children: "\u2764\uFE0F Interests" }), _jsx("div", { className: "scroll-area", children: profileData.interests && profileData.interests.length > 0 ? (_jsx("div", { children: profileData.interests.map((interest, index) => (_jsx("span", { className: "interest-chip", children: interest }, index))) })) : (_jsx("p", { style: { color: '#999', fontStyle: 'italic' }, children: "No interests listed." })) })] })] })), !isLoading && activeSection === 'forums' && (_jsxs("div", { className: "forums-list", children: [_jsx("h3", { children: "Subscribed Forums" }), forums.length === 0 ? _jsx("p", { children: "No forums found." }) : (_jsx("ul", { style: { listStyle: 'none', padding: 0 }, children: forums.map((forum) => (_jsxs("li", { style: { padding: '10px', borderBottom: '1px solid #eee' }, children: [_jsx("strong", { children: forum.title }), _jsxs("span", { style: { float: 'right', color: '#888' }, children: [forum.memberCount, " Members"] })] }, forum.id))) }))] })), !isLoading && activeSection === 'friends' && (_jsxs("div", { className: "card", style: { minHeight: '400px' }, children: [_jsx("div", { className: "dashboard-header", style: { marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }, children: _jsxs("h2", { style: { margin: 0, fontSize: '1.5rem' }, children: ["Friends Network ", _jsxs("span", { style: { fontSize: '0.8em', color: '#999', fontWeight: 'normal' }, children: ["(", friends.length, ")"] })] }) }), friends.length === 0 ? (_jsx("div", { className: "content-placeholder", children: _jsx("p", { children: "No friends found in your decentralized network yet." }) })) : (_jsx("div", { className: "friends-grid", children: friends.map((friend) => (_jsxs("div", { className: "friend-card", children: [_jsx("div", { className: "friend-avatar-placeholder", children: friend.firstName.charAt(0).toUpperCase() }), _jsxs("h3", { className: "friend-name", children: [friend.firstName, " ", friend.lastName] }), _jsxs("p", { className: "friend-city", children: ["\uD83D\uDCCD ", friend.city || 'Unknown City'] }), _jsx("button", { className: "btn-outline-sm", onClick: () => alert(`Visiting ${friend.firstName} ${friend.lastName}'s pod...`), children: "View Profile" })] }, friend.friendCard))) }))] })), !isLoading && !activeSection && (_jsx("p", { style: { color: '#888', textAlign: 'center' }, children: "Select an action above to query your profile data." }))] })] }));
};
//# sourceMappingURL=MyProfile.js.map