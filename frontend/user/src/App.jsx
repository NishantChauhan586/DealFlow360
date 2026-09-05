import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { SCREENS } from './data/mockData';
import Dashboard     from './pages/Dashboard';
import Pipeline      from './pages/Pipeline';
import Builder       from './pages/Builder';
import Approval      from './pages/Approval';
import Fulfillment   from './pages/Fulfillment';
import Subscriptions from './pages/Subscriptions';
import Portal        from './pages/Portal';
import Profile       from './pages/Profile';
import Login         from './pages/Login';
import './index.css';

/**
 * SCREEN_MAP — maps route pathname → SCREENS key
 * Used by Topbar to resolve the current page title/sub
 */
const ROUTE_MAP = {
  '/':              'dashboard',
  '/pipeline':      'pipeline',
  '/builder':       'builder',
  '/approval':      'approval',
  '/fulfillment':   'fulfillment',
  '/subscriptions': 'subscriptions',
  '/portal':        'portal',
  '/profile':       'profile',
};

function Topbar() {
  const { pathname } = useLocation();
  const key    = ROUTE_MAP[pathname] ?? 'dashboard';
  const screen = SCREENS[key];
  return (
    <div className="topbar">
      <div>
        <h1>{screen?.title ?? 'Deal Operations'}</h1>
        <div className="sub">{screen?.sub ?? 'DealFlow360 Platform'}</div>
      </div>
      <div className="topbar-actions">
        <button className="btn btn-ghost">Reload data</button>
        <button className="btn btn-dark">Go to backend</button>
      </div>
    </div>
  );
}

function AppShell() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content">
          <Routes>
            <Route path="/"              element={<Dashboard />}     />
            <Route path="/dashboard"     element={<Navigate to="/" replace />} />
            <Route path="/pipeline"      element={<Pipeline />}      />
            <Route path="/builder"       element={<Builder />}       />
            <Route path="/approval"      element={<Approval />}      />
            <Route path="/fulfillment"   element={<Fulfillment />}   />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/portal"        element={<Portal />}        />
            <Route path="/profile"       element={<Profile />}       />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
