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
        <AdminLogin onLogin={() => setAdminAuthed(true)} />
      ) : view === 'admin' ? (
        <AdminPanel socket={socket} onBack={() => { setView('player'); setAdminAuthed(false); }} />
      ) : (
        <EventPage socket={socket} />
      )}

      <div className="view-toggle">
        <a href="/" className="main-site-btn">← MAIN SITE</a>
      </div>

      {socket.error && <div className="toast-error">{socket.error}</div>}
    </div>
  );
}
