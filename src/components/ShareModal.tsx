import React, { useState } from 'react';
import { X, Copy, Check, Share2, Clock } from 'lucide-react';

interface ShareModalProps {
  document: any;
  onClose: () => void;
  onGenerateShareLink: (expiresIn: number | null) => Promise<string>;
  onAddToast: (text: string, type?: 'success' | 'error') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document: doc,
  onClose,
  onGenerateShareLink,
  onAddToast,
}) => {
  const [expiryOption, setExpiryOption] = useState<number | null>(3600); // Default: 1 hour (3600s)
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setShareUrl('');
    setCopied(false);
    try {
      const url = await onGenerateShareLink(expiryOption);
      setShareUrl(url);
      onAddToast("Secure sharing link generated!");
    } catch (err) {
      console.error(err);
      onAddToast("Failed to generate sharing link", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onAddToast("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onAddToast("Failed to copy link", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="var(--accent-primary)" />
            <h3 className="modal-title">Share Document</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>Sharing file:</p>
          <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.name}
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} />
            Link Expiration
          </label>
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '4px',
            marginTop: '6px',
            gap: '4px'
          }}>
            <button 
              type="button"
              onClick={() => { setExpiryOption(3600); setShareUrl(''); }}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: expiryOption === 3600 ? 'var(--bg-primary)' : 'transparent',
                color: expiryOption === 3600 ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'calc(var(--border-radius-sm) - 2px)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              1 Hour
            </button>
            <button 
              type="button"
              onClick={() => { setExpiryOption(36000); setShareUrl(''); }}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: expiryOption === 36000 ? 'var(--bg-primary)' : 'transparent',
                color: expiryOption === 36000 ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'calc(var(--border-radius-sm) - 2px)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              10 Hours
            </button>
            <button 
              type="button"
              onClick={() => { setExpiryOption(null); setShareUrl(''); }}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: expiryOption === null ? 'var(--bg-primary)' : 'transparent',
                color: expiryOption === null ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'calc(var(--border-radius-sm) - 2px)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Forever
            </button>
          </div>
        </div>

        {shareUrl ? (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'scaleIn 0.25s ease-out' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Sharing URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                value={shareUrl} 
                readOnly 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{ flex: 1, background: 'var(--bg-secondary)', borderStyle: 'dashed' }}
              />
              <button 
                type="button" 
                className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`} 
                onClick={handleCopy}
                style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--success)', margin: '4px 0 0 0' }}>
              * Anyone with this link can view the file. {expiryOption ? `It expires on ${new Date(Date.now() + expiryOption * 1000).toLocaleString()}` : 'It will never expire.'}
            </p>
          </div>
        ) : (
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: '100%', padding: '12px', justifyContent: 'center', fontWeight: 500, marginBottom: '16px' }}
          >
            {isGenerating ? 'Generating secure signature...' : 'Generate Sharing Link'}
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
