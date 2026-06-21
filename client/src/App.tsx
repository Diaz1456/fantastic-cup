import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import MonopolyPage from './components/MonopolyPage';
import MonopolyAdmin from './components/MonopolyAdmin';
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
        <MonopolyAdmin socket={socket} onBack={() => { setView('player'); setAdminAuthed(false); }} />
      ) : (
        <MonopolyPage socket={socket} />
      )}

      <div className="mp-view-toggle">
        <button className={`mp-toggle-btn ${view === 'player' ? 'active' : ''}`} onClick={() => setView('player')}>SCOREBOARD</button>
        <button className={`mp-toggle-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>ADMIN</button>
        <a href="/event/team-stock.html" className="mp-main-btn">TEAM STOCK</a>
        <a href="/" className="mp-main-btn">MAIN SITE</a>
      </div>

      {socket.error && <div className="mp-toast">{socket.error}</div>}
    </div>
  );
}
