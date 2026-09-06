import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { UniversalTopbar } from './components/UniversalTopbar';
import { ROLES, hasRouteAccess } from './utils/permissions';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Builder       from './pages/Builder';
import Approval      from './pages/Approval';
import Fulfillment   from './pages/Fulfillment';
import Subscriptions from './pages/Subscriptions';
import AuthorityManagement from './pages/AuthorityManagement';
import ProductManagement from './pages/ProductManagement';
import Reports           from './pages/Reports';
import QuotationList     from './pages/QuotationList';
import Pipeline          from './pages/Pipeline';
import Portal        from './pages/Portal';
import './index.css';




/**
 * ProtectedRoute Component — Dynamic role-based guard
 */
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* Topbar replaced by UniversalTopbar component */

function AppShell({ user, onLogout, onRoleSwitch }) {
  const defaultRedirect = '/dashboard';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('df360_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const handleCollapsedChange = useCallback((collapsed) => {
    setSidebarCollapsed(collapsed);
  }, []);

  return (
    <div className="app">
      <Sidebar user={user} onLogout={onLogout} onCollapsedChange={handleCollapsedChange} />
      <div
        className="main"
        style={{
          marginLeft: 0,
          transition: 'margin-left 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <UniversalTopbar user={user} onLogout={onLogout} onRoleSwitch={onRoleSwitch} />
        <div className="content">
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.FINANCE]}>
                  <Navigate to={defaultRedirect} replace />
                </ProtectedRoute>
              } 
            />
            
            {/* Employee Internal Portal Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.FINANCE]}>
                  <Dashboard user={user} onRoleSwitch={onRoleSwitch} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER]}>
                  <Reports user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/quotations" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP]}>
                  <QuotationList user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pipeline" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP]}>
                  <Pipeline user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/builder" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.FINANCE, ROLES.CUSTOMER]}>
                  <Builder user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/approval" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Approval user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/fulfillment" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.FINANCE]}>
                  <Fulfillment user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscriptions" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.FINANCE]}>
                  <Subscriptions user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN, ROLES.FINANCE, ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.CUSTOMER]}>
                  <ProductManagement user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/authorities" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.ADMIN]}>
                  <AuthorityManagement user={user} />
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
    try {
      const saved = localStorage.getItem('dealflow_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.role && (parsed.email || parsed.username)) {
        return parsed;
      }
      localStorage.removeItem('dealflow_user');
      return null;
    } catch {
      localStorage.removeItem('dealflow_user');
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('dealflow_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dealflow_user');
  };

  const handleRoleSwitch = (newRole) => {
    if (!currentUser) return;
    const roleTitles = {
      admin: ' (Admin)',
      sales_manager: ' (Sales Manager)',
      sales_rep: ' (Sales Rep)',
      finance: ' (Finance & Ops)',
      customer: ' (Client)',
    };
    const prefix = currentUser.email ? currentUser.email.split('@')[0] : 'User';
    const formattedName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    
    const updatedUser = {
      ...currentUser,
      role: newRole,
      name: `${formattedName}${roleTitles[newRole] || ''}`
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('dealflow_user', JSON.stringify(updatedUser));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />
        <Route 
          path="/*" 
          element={
            currentUser ? (
              <AppShell user={currentUser} onLogout={handleLogout} onRoleSwitch={handleRoleSwitch} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
