import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { executeTraversalQuery, ReactTraversalLogger } from '../api/queryEngineStub.js';
export const ForumDetail = ({ setDebugQuery, logger, createTracker, onQueryStart, onQueryEnd, onResultArrived, registerQuery, }) => {
    const location = useLocation();
    const navigate = useNavigate();
    // "id" here is actually the ENCODED URI (e.g. https%3A%2F%2F...)
    const { id } = useParams();
    // 1. CALCULATE SUBJECT URI
    const forumUri = useMemo(() => {
        // Priority 1: Navigation State (Fastest)
        if (location.state?.forumUri) {
            return location.state.forumUri;
        }
        // Priority 2: Decode from URL (Handles Refresh)
        if (id) {
            try {
                return decodeURIComponent(id);
            }
            catch (e) {
                console.error("Failed to decode Forum URI", e);
                return "";
            }
        }
        return "";
    }, [id, location.state]);
    const activeStream = useRef(null);
    const [title, setTitle] = useState('');
    const [moderator, setModerator] = useState('');
    const [messagesMap, setMessagesMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    // --- Helper: Safe Navigation to Profiles ---
    const goToProfile = (authorId, authorUri) => {
        // Clean ID navigation (relies on the Profile component's ID reconstruction)
        navigate(`/profiles/${authorId}`, { state: { personUri: authorUri } });
    };
    useEffect(() => {
        const fetchForumData = async () => {
            // If we still don't have a URI (e.g. bad encoding), stop here
            if (!forumUri) {
                setIsLoading(false);
                return;
            }
            const queryModerator = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
        SELECT ?title ?fName ?lName ?mod  WHERE {
            <${forumUri}> rdf:type snvoc:Forum;
                snvoc:title ?title;
            OPTIONAL {
                <${forumUri}> snvoc:hasModerator ?mod.
                ?mod snvoc:firstName ?fName;
                    snvoc:lastName ?lName.
            }
        }`;
            const queryMessages = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
        SELECT ?content ?file ?msg ?date ?person ?authorName ?authorLastName ?id WHERE {
          <${forumUri}>  snvoc:containerOf ?msg.
          { ?msg snvoc:content ?content }
          UNION
          { ?msg snvoc:imageFile ?file }
          ?msg snvoc:creationDate ?date;
               snvoc:hasCreator ?person.
          ?person snvoc:firstName ?authorName;
                  snvoc:lastName ?authorLastName;
                  snvoc:id ?id.
        }`;
            setDebugQuery(queryModerator + "\n\n\n" + queryMessages);
            onQueryStart();
            try {
                // 1. Fetch Moderator info (No Traversal needed usually, just dereference forum)
                const bsMods = await executeTraversalQuery(queryModerator, { traverse: "false", log: logger }, undefined);
                bsMods.on('data', (binding) => {
                    onResultArrived();
                    if (binding.has('title'))
                        setTitle(binding.get('title').value);
                    if (binding.has('fName') && binding.has('lName')) {
                        setModerator(`${binding.get('fName').value} ${binding.get('lName').value}`);
                    }
                });
                // 2. Fetch Messages (Needs Traversal)
                const trackers = createTracker();
                let context = { log: logger };
                if (trackers) {
                    context = {
                        ...context,
                        [trackers.trackerDiscovery.key.name]: trackers.trackerDiscovery,
                        [trackers.trackerDereference.key.name]: trackers.trackerDereference,
                    };
                }
                const bsMessages = await executeTraversalQuery(queryMessages, context, 2);
                activeStream.current = bsMessages;
                registerQuery([bsMods, bsMessages], setIsLoading);
                bsMessages.on('data', (binding) => {
                    onResultArrived();
                    const msgUri = binding.get('msg').value;
                    const content = binding.has('content') ? binding.get('content').value : '';
                    const file = binding.has('file') ? binding.get('file').value : '';
                    const date = new Date(binding.get('date').value);
                    const authorUri = binding.get('person').value;
                    const authorFullName = `${binding.get('authorName').value} ${binding.get('authorLastName').value}`;
                    const authorId = `${binding.get('id').value}`;
                    setMessagesMap((prev) => {
                        const existing = prev[msgUri] || {
                            uri: msgUri,
                            content: '',
                            imageFile: '',
                            date: date,
                            authorUri: authorUri,
                            authorName: authorFullName,
                            authorid: authorId,
                        };
                        return {
                            ...prev,
                            [msgUri]: {
                                ...existing,
                                content: content || existing.content,
                                imageFile: file || existing.imageFile,
                            }
                        };
                    });
                    setIsLoading(false);
                });
                bsMessages.on('end', () => {
                    setIsLoading(false);
                    onQueryEnd();
                });
            }
            catch (err) {
                console.error("Forum query failed", err);
                setIsLoading(false);
            }
        };
        fetchForumData();
        return () => {
            if (activeStream.current)
                activeStream.current.destroy();
        };
    }, [forumUri, setDebugQuery]);
    const sortedMessages = Object.values(messagesMap).sort((a, b) => b.date.getTime() - a.date.getTime());
    return (_jsxs("div", { className: "container", style: { maxWidth: '800px', margin: '20px auto', padding: '0 20px' }, children: [_jsx("button", { className: "btn-primary", onClick: () => navigate(-1), style: { marginBottom: '20px' }, children: "\u2190 Back" }), !forumUri ? (_jsx("div", { className: "card", children: "\u274C Error: Invalid Forum Link" })) : isLoading && sortedMessages.length === 0 ? (_jsxs("div", { className: "card loading-pulse", children: [_jsx("div", { className: "spinner" }), "Searching for forum messages..."] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card forum-header-card", children: [_jsx("h1", { children: title || 'Untitled Forum' }), _jsxs("p", { className: "forum-mod", children: ["\uD83D\uDEE1\uFE0F Moderator: ", _jsx("strong", { children: moderator || 'None' })] }), _jsxs("div", { style: { fontSize: '0.75rem', color: '#999', marginTop: '5px', wordBreak: 'break-all' }, children: ["Source: ", forumUri] })] }), _jsxs("div", { className: "message-list", children: [_jsxs("h3", { children: ["Recent Activity (", sortedMessages.length, ")"] }), sortedMessages.map((msg) => (_jsxs("div", { className: "card message-card", style: { marginBottom: '15px', padding: '20px' }, children: [_jsxs("div", { className: "author-link", style: {
                                            fontWeight: 'bold',
                                            color: '#2563eb',
                                            marginBottom: '8px',
                                            display: 'inline-block',
                                            cursor: 'pointer'
                                        }, onClick: () => goToProfile(msg.authorid, msg.authorUri), children: ["\uD83D\uDC64 ", msg.authorName] }), msg.content && (_jsx("div", { style: { marginBottom: '10px' }, children: _jsx("p", { style: { margin: 0, fontSize: '1.1rem', color: '#1e293b' }, children: msg.content }) })), msg.imageFile && (_jsxs("div", { className: "image-attachment-preview", children: [_jsx("small", { children: "\uD83D\uDDBC\uFE0F Image Attachment:" }), _jsx("code", { children: msg.imageFile })] })), _jsx("div", { className: "message-footer", children: _jsxs("small", { children: ["Posted: ", msg.date.toLocaleString()] }) })] }, msg.uri)))] })] }))] }));
};
//# sourceMappingURL=ForumDetail.js.map