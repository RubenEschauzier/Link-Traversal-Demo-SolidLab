import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '60px auto', 
      padding: '0 20px', 
      textAlign: 'center' 
    }}>
      {/* Hero Section */}
      <div className="card" style={{ padding: '60px 40px', borderBottom: '4px solid #2563eb' }}>
        <h1 style={{ fontSize: '3rem', color: '#1e293b', marginBottom: '10px' }}>
          SolidLab <span style={{ color: '#2563eb' }}>Demo</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 30px auto' }}>
          Experience the power of <strong>Link Traversal</strong> in a decentralized social network. 
          No central database—just a query engine following links across the web.
        </p>

        {!isAuthenticated ? (
          <button 
            className="btn-primary" 
            style={{ padding: '12px 32px', fontSize: '1.1rem' }}
          >
            🚀 Start Traversal Demo (Login)
          </button>
        ) : (
          <button 
            className="btn-primary" 
            style={{ padding: '12px 32px', fontSize: '1.1rem' }}
            onClick={() => navigate('/profile')}
          >
            📂 Enter Dashboard
          </button>
        )}
      </div>

      {/* Concept Explanation */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginTop: '40px' 
      }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
          <h3 style={{ marginTop: 0 }}>Discover</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            The engine starts at your WebID and follows <code>foaf:knows</code> links to find your friends' data.
          </p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔗</div>
          <h3 style={{ marginTop: 0 }}>Traverse</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Data is fetched live from multiple Pods. We don't "own" the data; we just browse the links.
          </p>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚡</div>
          <h3 style={{ marginTop: 0 }}>Stream</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Results appear in the UI the moment they are found, thanks to reactive RDF streams.
          </p>
        </div>
      </div>

      {/* Technical Diagram Placeholder */}
      <div style={{ marginTop: '50px' }}>
        <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '20px' }}>
          How Link Traversal Query Processing (LTQP) works:
        </p>
        
      </div>
    </div>
  );
};