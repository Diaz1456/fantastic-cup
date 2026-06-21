import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import ShowdownPage from './components/ShowdownPage';
import ShowdownAdmin from './components/ShowdownAdmin';
import AdminLogin from './components/AdminLogin';

export default function App() {
  const [view, setView] = useState<'player' | 'admin'>('player');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const socket = useSocket();

  return (
    <div className="app">
      {view === 'admin' && !adminAuthed ? (
        <AdminLogin onLogin={() => setAdminAuthed(true)} />
      ) : view === 'admin' ? (
        <ShowdownAdmin socket={socket} onBack={() => { setView('player'); setAdminAuthed(false); }} />
      ) : (
        <ShowdownPage socket={socket} />
      )}

      <div className="sd-view-toggle">
        <button className={`sd-toggle-btn ${view === 'player' ? 'active' : ''}`} onClick={() => setView('player')}>SCOREBOARD</button>
        <button className={`sd-toggle-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>ADMIN</button>
        <a href="/" className="sd-main-btn">MAIN SITE</a>
      </div>

      {socket.error && <div className="sd-toast">{socket.error}</div>}
    </div>
  );
}
