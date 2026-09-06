import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import gsap from 'gsap';
import {
  IconDash, IconCart, IconCheck, IconTruck, IconRefresh,
  IconUsers, IconShield, IconLogout, IconChart, IconBox,
} from './Icons';
import { ROLE_PERMISSIONS, ROLE_LABELS, ROLES } from '../utils/permissions';
import s from './Sidebar.module.css';

/* ── Lucide-style SVG chevrons ── */
function ChevronLeft({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ── Nav definition ── */
const MASTER_NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',                   icon: IconDash,    end: true },
  { to: '/products',      label: 'Products & Pricing Management', icon: IconBox,    roles: [ROLES.ADMIN, ROLES.FINANCE, ROLES.SALES_MANAGER, ROLES.SALES_REP, ROLES.CUSTOMER] },
  { to: '/quotations',    label: 'Pipeline View',               icon: IconCart,    roles: [ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_REP] },
  { to: '/builder',       label: 'Quotation Builder',           icon: IconCart },
  { to: '/approval',      label: 'Approvals',                   icon: IconCheck,   roles: [ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.FINANCE] },
  { to: '/fulfillment',   label: 'Fulfillment',                 icon: IconTruck,   roles: [ROLES.ADMIN, ROLES.FINANCE] },
  { to: '/subscriptions', label: 'Subscriptions',               icon: IconRefresh },
  { to: '/reports',       label: 'Sales Reports',               icon: IconChart },
  { to: '/authorities',   label: 'Authority Mgmt',              icon: IconShield },
  { to: '/portal',        label: 'Customer Portal',             icon: IconUsers,   roles: [ROLES.CUSTOMER, ROLES.SALES_REP, ROLES.ADMIN], end: true },
];

/* ── Single nav item with tooltip support ── */
function NavItem({ item, collapsed }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipY, setTooltipY] = useState(0);
  const wrapRef = useRef(null);

  const handleMouseEnter = () => {
    if (!collapsed) return;
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setTooltipY(rect.top + rect.height / 2);
    }
    setShowTooltip(true);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <NavLink
        to={item.to}
        end={item.end ?? true}
        className={({ isActive }) =>
          `${s.navItem}${isActive ? ' ' + s.active : ''}`
        }
        aria-label={item.label}
      >
        <span className={s.navIcon}>
          <item.icon />
        </span>
        {!collapsed && <span className={s.navLabel}>{item.label}</span>}
        {!collapsed && item.badge != null && (
          <span className={s.badge}>{item.badge}</span>
        )}
      </NavLink>

      {/* Portal-style tooltip rendered at fixed position */}
      {collapsed && showTooltip && (
        <div
          className={`${s.tooltip} ${s.visible}`}
          style={{ top: tooltipY, transform: 'translateY(-50%)' }}
          role="tooltip"
        >
          {item.label}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   Main Sidebar component
   ════════════════════════════════════════ */
export function Sidebar({ user, onLogout, onCollapsedChange }) {
  const role = user?.role || ROLES.CUSTOMER;
  const isCustomer = role === ROLES.CUSTOMER;
  const roleConfig = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.CUSTOMER];

  /* ── Collapse state: persist to localStorage ── */
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('df360_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  /* ── Sidebar DOM ref for GSAP ── */
  const sidebarRef = useRef(null);
  const innerRef = useRef(null);
  const firstRender = useRef(true);

  /* ── Notify parent when collapsed changes (for main content margin) ── */
  useEffect(() => {
    if (onCollapsedChange) onCollapsedChange(collapsed);
  }, [collapsed, onCollapsedChange]);

  /* ── GSAP animation on collapse toggle ── */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return; // skip animation on mount — CSS handles initial state
    }
    if (!sidebarRef.current) return;

    const expandedW = 236;
    const collapsedW = 64;
    const targetW = collapsed ? collapsedW : expandedW;

    gsap.to(sidebarRef.current, {
      width: targetW,
      duration: 0.28,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }, [collapsed]);

  /* ── GSAP stagger on mount: nav items fade in ── */
  useEffect(() => {
    if (!innerRef.current) return;
    const items = innerRef.current.querySelectorAll(`.${s.navItem}`);
    gsap.fromTo(
      items,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', delay: 0.05 }
    );
  }, []);

  /* ── Keyboard shortcut: Ctrl+B ── */
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('df360_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  /* ── Filter nav by role/permissions ── */
  const navItems = MASTER_NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    return roleConfig.routes.some((r) => item.to.startsWith(r));
  });

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('dealflow_user');
      window.location.href = '/login';
    }
  };

  const roleLabel = ROLE_LABELS[role] || 'Internal User';
  const initials = user?.name
    ? user.name.substring(0, 2).toUpperCase()
    : roleLabel.substring(0, 2).toUpperCase();

  return (
    <aside
      ref={sidebarRef}
      className={`${s.sidebar}${collapsed ? ' ' + s.collapsed : ''}`}
      aria-label="Main navigation"
      style={{ width: collapsed ? 64 : 236 }}
    >
      <div ref={innerRef} className={s.sidebarInner}>

        {/* ── Brand ── */}
        <div className={s.brand}>
          <div
            className={`${s.logoWrap}${collapsed ? ' ' + s.logoWrapCollapsed : ''}`}
            onClick={collapsed ? toggle : undefined}
            role={collapsed ? 'button' : undefined}
            tabIndex={collapsed ? 0 : undefined}
            aria-label={collapsed ? 'Expand sidebar' : undefined}
            onKeyDown={collapsed ? (e) => (e.key === 'Enter' || e.key === ' ') && toggle() : undefined}
            title={collapsed ? 'Click to expand sidebar (Ctrl+B)' : undefined}
          >
            <div className={s.logoInner}>
              <img
                src="/meridian-logo.svg"
                alt="Meridian"
                className={s.logoImg}
                width={36}
                height={36}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const parent = e.target.parentNode;
                  if (parent) {
                    const fallback = parent.querySelector('.' + s.logoFallback);
                    if (fallback) fallback.style.display = 'flex';
                  }
                }}
              />
              <span className={s.logoFallback} style={{ display: 'none' }}>M</span>
            </div>

            {collapsed && (
              <div className={s.logoExpandOverlay} aria-hidden="true">
                <ChevronRight size={18} />
              </div>
            )}
          </div>

          {!collapsed && (
            <div className={s.brandText}>
              <div className={s.brandMark}>Meridian</div>
              <div className={s.brandSub}>
                {isCustomer ? 'Client Portal' : 'Sales Ops'}
              </div>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              className={s.toggleBtn}
              onClick={toggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar (Ctrl+B)"
            >
              <span className={s.toggleIcon}>
                <ChevronLeft size={14} />
              </span>
            </button>
          )}
        </div>

        {/* ── Section label ── */}
        {!collapsed && (
          <div className={s.sectionLabel}>
            {isCustomer ? 'Client Workspace' : 'Employee Workspace'}
          </div>
        )}

        {/* ── Nav ── */}
        <nav className={s.nav} aria-label="Workspace navigation">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className={s.divider} />

        {/* ── Footer ── */}
        <div className={s.footer}>
          <div className={s.avatar} title={user?.name || roleLabel}>
            {initials}
          </div>

          {!collapsed && (
            <div className={s.footerInfo}>
              <div className={s.footerName} title={user?.name || roleLabel}>
                {user?.name || roleLabel}
              </div>
              <div className={s.footerRole}>{roleLabel}</div>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={handleLogoutClick}
              className={s.logoutBtn}
              title="Sign out"
              aria-label="Log out"
            >
              <IconLogout style={{ width: 15, height: 15 }} />
            </button>
          )}
        </div>

      </div>
    </aside>
  );
}
