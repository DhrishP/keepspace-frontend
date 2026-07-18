import React, { useState } from 'react';

interface LoginProps {
  onUnlock: (password: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = onUnlock(password);
    if (!success) {
      setError('Invalid master passphrase. Please try again.');
      setPassword('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        padding: '32px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Dial Safe Logo */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--border-radius-sm)',
          background: 'var(--accent-primary)',
          color: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32" fill="none">
            <rect x="26" y="26" width="48" height="48" rx="8" stroke="currentColor" strokeWidth="10" />
            <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="10" />
            <line x1="50" y1="26" x2="50" y2="38" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>Unlock KeepSpace Vault</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Enter master passphrase to decrypt security keys</p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passphrase</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                textAlign: 'center',
                letterSpacing: password ? '0.3em' : 'normal',
                fontSize: '16px'
              }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--border-radius-sm)',
              padding: '10px',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              padding: '12px',
              fontWeight: 500,
              fontSize: '14px',
              marginTop: '8px'
            }}
          >
            Unlock Vault
          </button>
        </form>
      </div>
    </div>
  );
};
