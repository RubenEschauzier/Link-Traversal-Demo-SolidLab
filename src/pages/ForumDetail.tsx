import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { executeTraversalQuery, ReactTraversalLogger } from '../api/queryEngineStub.js';
import type { BindingsStream } from '@comunica/types';
import { StatisticTraversalTopology } from '@rubeneschauzier/statistic-traversal-topology';
import type { StatisticLinkDiscovery } from '@comunica/statistic-link-discovery';
import type { StatisticLinkDereference } from '@comunica/statistic-link-dereference';

// --- Props Interface ---
interface ForumProps {
  setDebugQuery: (query: string) => void;
  logger: ReactTraversalLogger | undefined;
  createTracker: () => {
    trackerDiscovery: StatisticLinkDiscovery;
    trackerDereference: StatisticLinkDereference;
  } | null;
  onQueryStart: () => void;
  onQueryEnd: () => void;
  onResultArrived: () => void;
  registerQuery: (stream: any[], setIsLoading: React.Dispatch<React.SetStateAction<boolean>>) => void;
}

interface Message {
  uri: string;
  content: string;
  imageFile: string;
  date: Date;
  authorUri: string;
  authorName: string;
  authorid: string;
}

export const ForumDetail: React.FC<ForumProps> = (
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
  const location = useLocation();
  const navigate = useNavigate();
  const forumUri = location.state?.forumUri;
  const activeStream = useRef<BindingsStream | null>(null);

  const [title, setTitle] = useState('');
  const [moderator, setModerator] = useState('');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForumData = async () => {
      if (!forumUri) return;

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

      try {
        const bsMods: BindingsStream = await executeTraversalQuery(queryModerator,
             {traverse: "false", log: logger }, undefined);
        bsMods.on('data', (binding) => {
          if (binding.has('title')) setTitle(binding.get('title').value);
          if (binding.has('fName') && binding.has('lName')) {
            setModerator(`${binding.get('fName').value} ${binding.get('lName').value}`);
          }
          setIsLoading(false);
        })
        const trackers = createTracker();
        let context = {log: logger};
        if (trackers){
          context = {
            ...context, 
            [trackers.trackerDiscovery.key.name]: trackers.trackerDiscovery,
            [trackers.trackerDereference.key.name]: trackers.trackerDereference,
          };
        }
        const bsMessages: BindingsStream = await executeTraversalQuery(queryMessages, context, 2);
        activeStream.current = bsMessages;
        registerQuery([bsMods, bsMessages], setIsLoading);

        bsMessages.on('data', (binding) => {
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

        bsMessages.on('end', () => setIsLoading(false));
      } catch (err) {
        console.error("Forum query failed", err);
        setIsLoading(false);
      }
    };

    fetchForumData();

    return () => {
      if (activeStream.current) activeStream.current.destroy();
    };
  }, [forumUri, setDebugQuery]);

  const sortedMessages = Object.values(messagesMap).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '20px auto', padding: '0 20px' }}>
      <button className="btn-primary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        ← Back to Profile
      </button>

      {isLoading && sortedMessages.length === 0 ? (
        <div className="card loading-pulse">Searching for forum messages...</div>
      ) : (
        <>
          <div className="card forum-header-card">
            <h1>{title || 'Untitled Forum'}</h1>
            <p className="forum-mod">
              🛡️ Moderator: <strong>{moderator || 'None'}</strong>
            </p>
          </div>

          <div className="message-list">
            <h3>Recent Activity ({sortedMessages.length})</h3>
            {sortedMessages.map((msg) => (
              <div 
                key={msg.uri} 
                className="card message-card" 
                style={{ marginBottom: '15px', padding: '20px', cursor: 'pointer' }}
              >
                {/* Author Info */}
                <div 
                  className="author-link"
                  style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '8px', display: 'inline-block' }}
                  onClick={() => navigate(`/profiles/${msg.authorid}`, { state: { personUri: msg.authorUri } })}

                >
                  👤 {msg.authorName}
                </div>
                
                {/* Content */}
                {msg.content && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{msg.content}</p>
                  </div>
                )}

                {/* Image Placeholder */}
                {msg.imageFile && (
                  <div className="image-attachment-preview">
                    <small>🖼️ Image Attachment:</small>
                    <code>{msg.imageFile}</code>
                  </div>
                )}

                <div className="message-footer">
                  <small>Posted: {msg.date.toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};