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
import AuthorityManagement from './pages/AuthorityManagement';
import Portal        from './pages/Portal';
import './index.css';

/**
 * ROUTE_MAP — maps route pathname → SCREENS key
 */
const ROUTE_MAP = {
  '/':              'dashboard',
  '/dashboard':     'dashboard',
  '/pipeline':      'pipeline',
  '/builder':       'builder',
  '/approval':      'approval',
  '/fulfillment':   'fulfillment',
  '/subscriptions': 'subscriptions',
  '/authorities':   'authorities',
  '/portal':        'portal',
};

/**
 * ProtectedRoute Component — Strict role-based guard
 */
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If Customer attempts to access Admin pages -> Redirect to Customer Portal
    if (user.role === 'customer') {
      return <Navigate to="/portal" replace />;
    }
    // If Admin attempts to access Customer Portal -> Redirect to Admin Dashboard
    if (user.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

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
            <span style={{ 
              fontSize: '11.5px', 
              padding: '4px 10px', 
              borderRadius: '20px',
              background: user.role === 'admin' ? 'rgba(0, 34, 28, 0.1)' : 'rgba(67, 138, 126, 0.15)',
              color: user.role === 'admin' ? 'var(--burnham)' : 'var(--viridian-600)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {user.role === 'admin' ? 'Shield Admin' : 'Customer Account'}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
              {user.name || user.username}
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
  const defaultRedirect = user?.role === 'customer' ? '/portal' : '/dashboard';

  return (
    <div className="app">
      <Sidebar user={user} />
      <div className="main">
        <Topbar user={user} onLogout={onLogout} />
        <div className="content">
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin', 'customer']}>
                  <Navigate to={defaultRedirect} replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Exclusive Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pipeline" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Pipeline />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/builder" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Builder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/approval" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Approval />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfillment" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Fulfillment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscriptions" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <Subscriptions />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/authorities" 
              element={
                <ProtectedRoute user={user} allowedRoles={['admin']}>
                  <AuthorityManagement />
                </ProtectedRoute>
              } 
            />

            {/* Customer Exclusive Portal Route */}
            <Route 
              path="/portal" 
              element={
                <ProtectedRoute user={user} allowedRoles={['customer']}>
                  <Portal user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('dealflow_user');
    return saved ? JSON.parse(saved) : null;
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
          element={
            currentUser ? (
              <AppShell user={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
