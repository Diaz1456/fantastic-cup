import { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import EventPage from './components/EventPage';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';

export default function App() {
  const [view, setView] = useState<'player' | 'admin'>('player');
  const [adminAuthed, setAdminAuthed] = useState(false);
  const socket = useSocket();

  return (
    <div className="app">
      {view === 'admin' && !adminAuthed ? (
        <AdminLogin onLogin={() => setAdminAuthed(true)} socket={socket} />
      ) : view === 'admin' ? (
        <AdminPanel socket={socket} onBack={() => { setView('player'); setAdminAuthed(false); }} />
      ) : (
        <EventPage socket={socket} />
      )}

      <div className="view-toggle">
        <button className={`toggle-btn ${view === 'player' ? 'active' : ''}`} onClick={() => setView('player')}>EVENT</button>
        <button className={`toggle-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>ADMIN</button>
      </div>

      {socket.error && <div className="toast-error">{socket.error}</div>}
    </div>
  );
}
