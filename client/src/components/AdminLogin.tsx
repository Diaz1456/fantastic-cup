import { useState } from 'react';

interface Props {
  onLogin: () => void;
  socket: { adminLogin: (pw: string) => void; error: string | null };
}

export default function AdminLogin({ onLogin, socket }: Props) {
  const [pw, setPw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    socket.adminLogin(pw);
    setTimeout(() => { if (!socket.error) onLogin(); }, 500);
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-emblem">⚔</div>
        <h1 className="login-title">COMMAND ACCESS</h1>
        <p className="login-sub">Authorized Personnel Only</p>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Access Code" value={pw} onChange={e => setPw(e.target.value)} className="login-input" autoFocus />
          <button type="submit" className="login-btn">GAIN ACCESS</button>
        </form>
        {socket.error && <p className="login-error">{socket.error}</p>}
      </div>
    </div>
  );
}
