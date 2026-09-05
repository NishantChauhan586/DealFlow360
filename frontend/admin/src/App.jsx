import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { SCREENS } from './data/mockData';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Pipeline      from './pages/Pipeline';
import Builder       from './pages/Builder';
import Approval      from './pages/Approval';
import Fulfillment   from './pages/Fulfillment';
import Subscriptions from './pages/Subscriptions';
import Portal        from './pages/Portal';
import './index.css';

/**
 * ROUTE_MAP — maps route pathname → SCREENS key
 * Used by Topbar to resolve the current page title/sub
 */
const ROUTE_MAP = {
  '/':              'dashboard',
  '/dashboard':     'dashboard',
  '/pipeline':      'pipeline',
  '/builder':       'builder',
  '/approval':      'approval',
  '/fulfillment':   'fulfillment',
  '/subscriptions': 'subscriptions',
  '/portal':        'portal',
};

function Topbar({ user, onLogout }) {
  const { pathname } = useLocation();
  const key    = ROUTE_MAP[pathname] ?? 'dashboard';
  const screen = SCREENS[key] || { title: 'Dashboard', sub: 'Overview of DealFlow360 metrics' };
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div>
        <h1>{screen.title}</h1>
        <div className="sub">{screen.sub}</div>
      </div>
      <div className="topbar-actions">
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--viridian-600)', fontWeight: 600 }}>
              User: {user.username}
            </span>
            <button className="btn btn-ghost" onClick={onLogout}>
              Sign out
            </button>
          </div>
        ) : (
          <button className="btn btn-dark" onClick={() => navigate('/login')}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}

function AppShell({ user, onLogout }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar user={user} onLogout={onLogout} />
        <div className="content">
          <Routes>
            <Route path="/"              element={<Dashboard />}     />
            <Route path="/dashboard"     element={<Dashboard />}     />
            <Route path="/pipeline"      element={<Pipeline />}      />
            <Route path="/builder"       element={<Builder />}       />
            <Route path="/approval"      element={<Approval />}      />
            <Route path="/fulfillment"   element={<Fulfillment />}   />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/portal"        element={<Portal />}        />
            <Route path="*"              element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('dealflow_user');
    return saved ? JSON.parse(saved) : { username: 'admin' };
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('dealflow_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dealflow_user');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={<Login onLoginSuccess={handleLoginSuccess} />} 
        />
        <Route 
          path="/*" 
          element={<AppShell user={currentUser} onLogout={handleLogout} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

