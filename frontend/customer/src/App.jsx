import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { UniversalTopbar } from './components/UniversalTopbar';
import { ROLE_LABELS, ROLES, hasRouteAccess } from './utils/permissions';
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
    return <Navigate to="/portal" replace />;
  }

  return children;
}

function AppShell({ user, onLogout, onRoleSwitch }) {
  const defaultRedirect = '/portal';
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
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER]}>
                  <Navigate to={defaultRedirect} replace />
                </ProtectedRoute>
              } 
            />

            {/* Customer Portal Route */}
            <Route 
              path="/portal" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Portal user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Products & Pricing Route */}
            <Route 
              path="/products" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <ProductManagement user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Quotation Builder Route */}
            <Route 
              path="/builder" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Builder user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Quotations List Route */}
            <Route 
              path="/quotations" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <QuotationList user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Pipeline Route */}
            <Route 
              path="/pipeline" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Pipeline user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Fulfillment Route */}
            <Route 
              path="/fulfillment" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Fulfillment user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Subscriptions Route */}
            <Route 
              path="/subscriptions" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Subscriptions user={user} />
                </ProtectedRoute>
              } 
            />

            {/* Reports Route */}
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute user={user} allowedRoles={[ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE]}>
                  <Reports user={user} />
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
              <Navigate to="/portal" replace />
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
