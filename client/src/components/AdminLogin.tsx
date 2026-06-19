import { useState } from 'react';

interface Props {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pw) { setError('Access code required.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/event-bridge/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (data.token === 'granted') {
        onLogin();
      } else {
        setError('Invalid access code.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-emblem">🎴</div>
        <h1 className="login-title">COMMAND ACCESS</h1>
        <p className="login-sub">Authorized Personnel Only</p>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Access Code" value={pw} onChange={e => setPw(e.target.value)} className="login-input" autoFocus />
          <button type="submit" className="login-btn" disabled={loading}>{loading ? 'VERIFYING...' : 'GAIN ACCESS'}</button>
        </form>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
