import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { executeTraversalQuery, ReactTraversalLogger } from '../api/queryEngineStub.js';
import { useAuth } from '../context/AuthContext.js';
import '../index.css';
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
const processProfileBinding = (binding, prev) => {
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
export const Profile = ({ setDebugQuery, logger, createTracker, onQueryStart, onQueryEnd, onResultArrived, registerQuery, }) => {
    const activeStream = useRef(null);
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [forums, setForums] = useState([]);
    const [friends, setFriends] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
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
        return (_jsxs("div", { className: "card", style: { margin: '40px auto', maxWidth: '500px', textAlign: 'center' }, children: [_jsx("h2", { children: "Access Denied" }), _jsx("p", { children: "Please log in to view your profile." })] }));
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
            let context = { log: logger };
            if (trackers) {
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
            bs.on('data', (binding) => {
                onResultArrived();
                setProfileData(prev => processProfileBinding(binding, prev));
                setIsLoading(false);
            });
            bs.on('end', () => {
                setIsLoading(false);
                onQueryEnd();
            });
        }
        catch (error) {
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
            let context = { log: logger };
            if (trackers) {
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
            bs.on('data', (binding) => {
                if (activeStream.current !== bs)
                    return;
                onResultArrived();
                const forumIri = binding.get('forum').value;
                const newForum = {
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
                    countBs.on('data', (countBinding) => {
                        const count = parseInt(countBinding.get('count').value);
                        setForums(curr => curr.map(f => f.uri === forumIri ? { ...f, memberCount: count } : f));
                    });
                });
            });
            bs.on('end', () => {
                if (activeStream.current === bs) {
                    setIsLoading(false);
                    onQueryEnd();
                }
            });
        }
        catch (error) {
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
            let context = { log: logger };
            if (trackers) {
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
            bs.on('data', (binding) => {
                onResultArrived();
                const friendUri = binding.get('friendProfile').value;
                const newFriend = {
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
        }
        catch (error) {
            console.error("Failed to load friends", error);
            setIsLoading(false);
        }
    };
    // --- Main Render ---
    return (_jsxs("div", { style: { maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }, children: [_jsxs("div", { className: "dashboard-header", children: [_jsxs("h1", { className: "dashboard-title", children: ["Welcome back, ", user.name, " \uD83D\uDC4B"] }), _jsx("div", { className: "user-badge", children: _jsxs("span", { children: ["ID: ", user.username] }) })] }), _jsxs("div", { className: "action-bar", children: [_jsx("button", { className: "btn-primary", onClick: loadProfileInfo, disabled: isLoading, children: isLoading && activeSection === 'info' ? 'Loading...' : '📄 My Profile' }), _jsx("button", { className: "btn-primary", onClick: loadFriends, disabled: isLoading, children: isLoading && activeSection === 'friends' ? 'Loading...' : '👥 Friends' }), _jsx("button", { className: "btn-primary", onClick: loadForums, disabled: isLoading, children: isLoading && activeSection === 'forums' ? 'Loading...' : '💬 Forums' })] }), _jsxs("div", { style: { minHeight: '300px' }, children: [isLoading && (_jsx("div", { className: "card content-placeholder", children: _jsxs("div", { className: "loading-pulse", children: [_jsx("div", { className: "spinner" }), _jsx("span", { children: "Traversing the decentralized web..." })] }) })), !isLoading && activeSection === 'info' && profileData && (_jsxs("div", { className: "profile-container", children: [_jsxs("div", { className: "card profile-column-left", children: [_jsxs("div", { className: "profile-header", children: [_jsx("div", { className: "avatar-circle", children: "\uD83D\uDC64" }), _jsxs("div", { children: [_jsxs("h2", { style: { margin: 0 }, children: [profileData.name, " ", profileData.lastName] }), _jsxs("p", { style: { color: '#666' }, children: ["\uD83D\uDCCD ", profileData.city] })] })] }), _jsxs("div", { className: "metadata-grid", children: [_jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Gender" }), _jsx("div", { className: "meta-value", children: profileData.gender })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Birthday" }), _jsx("div", { className: "meta-value", children: profileData.birthday })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "Member Since" }), _jsx("div", { className: "meta-value", children: profileData.creationDate.toLocaleDateString() })] }), _jsxs("div", { children: [_jsx("div", { className: "meta-label", children: "IP Address" }), _jsx("div", { className: "meta-value", children: profileData.locationIP })] }), _jsxs("div", { style: { gridColumn: '1 / -1' }, children: [_jsx("div", { className: "meta-label", children: "Email" }), _jsx("div", { className: "meta-value", children: profileData.email })] })] })] }), _jsxs("div", { className: "card profile-column-right", children: [_jsx("h3", { children: "\u2764\uFE0F Interests" }), _jsx("div", { className: "scroll-area", children: profileData.interests.map((interest, i) => (_jsx("span", { className: "interest-chip", children: interest }, i))) })] })] })), !isLoading && activeSection === 'forums' && (_jsxs("div", { className: "card", children: [_jsxs("h2", { children: ["My Forums (", forums.length, ")"] }), _jsx("div", { className: "friends-grid", children: forums.map((forum) => (_jsxs("div", { className: "friend-card", children: [_jsx("div", { className: "friend-avatar-placeholder", style: { background: '#e0e7ff' }, children: "\uD83D\uDCAC" }), _jsx("h3", { className: "friend-name", children: forum.title }), _jsx("p", { className: "friend-city", children: forum.memberCount === -1 ? "⏳ Counting..." : `👥 ${forum.memberCount} Members` }), _jsx("button", { className: "btn-outline-sm", onClick: () => navigate(`/forums/${forum.id}`, { state: { forumUri: forum.uri } }), children: "View Forum" })] }, forum.uri))) })] })), !isLoading && activeSection === 'friends' && (_jsxs("div", { className: "card", children: [_jsxs("h2", { children: ["Friends Network (", friends.length, ")"] }), _jsx("div", { className: "friends-grid", children: friends.map((friend) => (_jsxs("div", { className: "friend-card", children: [_jsx("div", { className: "friend-avatar-placeholder", children: friend.firstName.charAt(0) }), _jsxs("h3", { className: "friend-name", children: [friend.firstName, " ", friend.lastName] }), _jsxs("p", { className: "friend-city", children: ["\uD83D\uDCCD ", friend.city] }), _jsx("button", { className: "btn-outline-sm", onClick: () => navigate(`/profiles/${friend.id}`, { state: { personUri: friend.friendCard } }), children: "View Profile" })] }, friend.friendCard))) })] }))] })] }));
};
//# sourceMappingURL=MyProfile.js.map