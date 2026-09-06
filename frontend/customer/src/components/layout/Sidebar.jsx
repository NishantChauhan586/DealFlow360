import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  Users,
  Building2,
  Activity,
  CheckSquare,
  BarChart3,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/deals', label: 'Deals', icon: Briefcase },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, collapsed }) {
  const { to, label, icon: Icon, end } = item;

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.active : ''}`
      }
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      <span className={styles.navIcon}>
        <Icon size={17} aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className={styles.navLabel}>{label}</span>
      )}
      {collapsed && (
        <span className={styles.tooltip} role="tooltip">{label}</span>
      )}
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile sidebar on route change
  const location = useLocation();
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          ${styles.sidebar}
          ${collapsed ? styles.collapsed : ''}
          ${mobileOpen ? styles.mobileOpen : ''}
        `.trim().replace(/\s+/g, ' ')}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <img
              src="/meridian-logo.svg"
              alt="Meridian"
              style={{ width: 22, height: 22, borderRadius: '50%', display: 'block' }}
            />
          </div>
          {!collapsed && (
            <span className={styles.brandName}>Meridian</span>
          )}
        </div>

        {/* Main Nav */}
        <nav className={styles.nav} aria-label="Primary navigation">
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Nav */}
        <div className={styles.bottom}>
          <ul className={styles.navList} role="list">
            {BOTTOM_ITEMS.map((item) => (
              <li key={item.to}>
                <NavItem item={item} collapsed={collapsed} />
              </li>
            ))}
          </ul>

          {/* Collapse toggle — desktop only */}
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={14} aria-hidden="true" />
              : <ChevronLeft size={14} aria-hidden="true" />
            }
          </button>
        </div>
      </aside>
    </>
  );
}
