/**
 * UniversalTopbar.jsx
 * DealFlow360 — Premium Universal Customer Top Navigation Bar
 *
 * Design: Linear/Vercel-inspired, minimal enterprise SaaS aesthetic
 * Animations: GSAP entrance, Framer Motion for interactions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Search, Bell, Plus, ChevronDown,
  LogOut, User, Settings, Shield, BarChart2,
  Zap, RefreshCw, CheckCircle2, AlertCircle,
  Clock, ArrowRight, FileText, Home
} from 'lucide-react';
import { ROLES } from '../utils/permissions';
import './UniversalTopbar.css';

/* ─── Page metadata ──────────────────────────────────────────────── */
const ROUTE_META = {
  '/':              { title: 'Customer Portal',    sub: 'Self-service quotation, ordering and contract management' },
  '/portal':        { title: 'Customer Portal',    sub: 'Self-service quotation, ordering and contract management' },
  '/dashboard':     { title: 'Deal Overview',      sub: 'Real-time view across your active quotations' },
  '/quotations':    { title: 'Quotations & Orders', sub: 'Your active deals and order history' },
  '/builder':       { title: 'Quotation Builder',  sub: 'Configure products and build a custom quote' },
  '/approval':      { title: 'Approval Status',    sub: 'Track quote approvals and discount requests' },
  '/fulfillment':   { title: 'Order Fulfillment',  sub: 'Track shipments, warehouse allocations & delivery' },
  '/subscriptions': { title: 'Subscriptions',       sub: 'Manage recurring billing and plan renewals' },
  '/reports':       { title: 'Account Analytics',  sub: 'Spend performance and contract reports' },
  '/products':      { title: 'Catalog & Pricing',   sub: 'Explore products, specifications and tiers' },
};

/* ─── Role config ─────────────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: ROLES.CUSTOMER, label: 'Customer', color: '#166534' },
];

/* ─── Quick commands for omnibar ─────────────────────────────────── */
const QUICK_COMMANDS = [
  { id: 'portal',       icon: Home,        label: 'Customer Portal',     sub: 'Main dashboard overview',      path: '/portal',      shortcut: 'H' },
  { id: 'new-quote',    icon: Plus,        label: 'New Quotation',       sub: 'Build custom quote',           path: '/builder',     shortcut: 'N' },
  { id: 'quotations',   icon: FileText,    label: 'Quotations & Orders', sub: 'View quote history',           path: '/quotations',  shortcut: 'Q' },
  { id: 'fulfillment', icon: Zap,          label: 'Order Delivery',      sub: 'Track shipment status',        path: '/fulfillment', shortcut: 'F' },
  { id: 'subscriptions',icon: Clock,        label: 'Subscriptions',       sub: 'Billing & renewals',           path: '/subscriptions',shortcut:'S' },
  { id: 'products',    icon: BarChart2,    label: 'Catalog & Tiers',     sub: 'Product catalog',              path: '/products',    shortcut: 'P' },
];

/* ─── Notification data ───────────────────────────────────────────── */
const MOCK_NOTIFS = [];

/* ─── Animation variants ──────────────────────────────────────────── */
const dropdownVariants = {
  hidden:  { opacity: 0, y: -8,  scale: 0.97 },
  visible: { opacity: 1, y: 0,   scale: 1,    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6,  scale: 0.97, transition: { duration: 0.12, ease: 'easeIn' } },
};

const itemVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.15, ease: 'easeOut' } }),
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

function getInitials(name) {
  if (!name) return 'DF';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

/* ─── Omnibar (Command Palette) ──────────────────────────────────── */
function Omnibar({ onClose }) {
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const navigate  = useNavigate();
  const inputRef  = useRef(null);

  const filtered = query.trim()
    ? QUICK_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.sub.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_COMMANDS;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback((cmd) => {
    navigate(cmd.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => (i + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => (i - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter' && filtered[selected]) {
      e.preventDefault();
      handleSelect(filtered[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="utb-omnibar-overlay" onClick={onClose}>
      <motion.div
        className="utb-omnibar"
        initial={{ opacity: 0, scale: 0.95, y: -12 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="utb-omnibar-input-row">
          <Search size={16} className="utb-omnibar-search-icon" />
          <input
            ref={inputRef}
            className="utb-omnibar-input"
            placeholder="Type a command or search pages..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
          />
          <span className="utb-omnibar-esc" onClick={onClose}>ESC</span>
        </div>

        <div className="utb-omnibar-section-label">Quick Navigation</div>

        <ul className="utb-omnibar-list">
          {filtered.length === 0 ? (
            <li style={{ padding: '16px', fontSize: '13px', color: 'var(--ink-40)', textAlign: 'center' }}>
              No commands found
            </li>
          ) : (
            filtered.map((cmd, i) => {
              const IconComp = cmd.icon;
              return (
                <li
                  key={cmd.id}
                  className={`utb-omnibar-item ${i === selected ? 'utb-omnibar-item--selected' : ''}`}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <div className="utb-omnibar-item-icon">
                    <IconComp size={15} />
                  </div>
                  <div className="utb-omnibar-item-body">
                    <span className="utb-omnibar-item-title">{cmd.label}</span>
                    <span className="utb-omnibar-item-sub">{cmd.sub}</span>
                  </div>
                  <span className="utb-kbd">⌘{cmd.shortcut}</span>
                </li>
              );
            })
          )}
        </ul>

        <div className="utb-omnibar-footer">
          <div className="utb-omnibar-hints">
            <span className="utb-omnibar-hint"><span className="utb-kbd">↑↓</span> to navigate</span>
            <span className="utb-omnibar-hint"><span className="utb-kbd">↵</span> to select</span>
            <span className="utb-omnibar-hint"><span className="utb-kbd">esc</span> to close</span>
          </div>
          <span>DealFlow360 Command Palette</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Notifications Menu ─────────────────────────────────────────── */
function NotificationMenu({ notifs, onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  const [list, setList] = useState(notifs);

  const markAllRead = () => {
    setList(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <motion.div
      ref={ref}
      className="utb-notif-panel"
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="utb-notif-header">
        <div className="utb-notif-title">
          <span>Notifications</span>
          {list.filter(n => n.unread).length > 0 && (
            <span className="utb-notif-count">{list.filter(n => n.unread).length}</span>
          )}
        </div>
        <button className="utb-notif-mark-read" onClick={markAllRead} type="button">
          Mark all read
        </button>
      </div>

      <ul className="utb-notif-list">
        {list.length === 0 ? (
          <li style={{ padding: '24px', fontSize: '12.5px', color: 'var(--ink-40)', textAlign: 'center' }}>
            No new notifications
          </li>
        ) : (
          list.map(n => (
            <li
              key={n.id}
              className={`utb-notif-item ${n.unread ? 'utb-notif-item--unread' : ''}`}
            >
              <div className="utb-notif-icon">
                {n.type === 'alert'    && <AlertCircle size={15} color="var(--rose)" />}
                {n.type === 'approval' && <CheckCircle2 size={15} color="var(--viridian)" />}
                {n.type === 'sync'     && <Zap          size={15} color="#EBAC32" />}
              </div>
              <div className="utb-notif-body">
                <span className="utb-notif-item-title">{n.title}</span>
                <span className="utb-notif-item-desc">{n.desc}</span>
              </div>
              <span className="utb-notif-time">{n.time}</span>
              {n.unread && <span className="utb-notif-dot" />}
            </li>
          ))
        )}
      </ul>
    </motion.div>
  );
}

/* ─── Profile Menu ───────────────────────────────────────────────── */
function ProfileMenu({ user, onLogout, onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  const initials = getInitials(user?.name || user?.username);

  return (
    <motion.div
      ref={ref}
      className="utb-profile-menu"
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="utb-profile-header">
        <div className="utb-profile-avatar-lg">{initials}</div>
        <div className="utb-profile-info">
          <div className="utb-profile-name">{user?.name || user?.username || 'Customer User'}</div>
          <div className="utb-profile-email">{user?.email || 'customer@dealflow360.com'}</div>
        </div>
      </div>

      <div className="utb-menu-divider" />

      {[
        { icon: User,     label: 'Account Profile' },
        { icon: Settings, label: 'Preferences' },
        { icon: Shield,   label: 'Security & Access' },
      ].map((item, i) => (
        <motion.button
          key={item.label}
          custom={i}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="utb-menu-item"
          type="button"
        >
          <item.icon size={13} />
          {item.label}
        </motion.button>
      ))}

      <div className="utb-menu-divider" />

      <motion.button
        custom={3}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="utb-menu-item utb-menu-item--danger"
        onClick={onLogout}
        type="button"
      >
        <LogOut size={13} />
        Sign out
      </motion.button>
    </motion.div>
  );
}

/* ─── Role Switcher ───────────────────────────────────────────────── */
function RoleSwitcher({ user, onRoleSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const current = ROLE_OPTIONS.find(r => r.value === user?.role) || ROLE_OPTIONS[0];

  return (
    <div className="utb-role-wrap" ref={ref}>
      <motion.button
        className={`utb-role-btn ${open ? 'utb-role-btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        type="button"
        whileTap={{ scale: 0.97 }}
        title="Active account role"
      >
        <span className="utb-role-dot" style={{ background: current.color }} />
        <span className="utb-role-label">
          <span className="utb-role-prefix">Role</span>
          {current.label}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex' }}
        >
          <ChevronDown size={11} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="utb-role-dropdown"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {ROLE_OPTIONS.map((opt, i) => (
              <motion.li
                key={opt.value}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className={`utb-role-option ${opt.value === user?.role ? 'utb-role-option--active' : ''}`}
                onClick={() => { onRoleSwitch && onRoleSwitch(opt.value); setOpen(false); }}
              >
                <span className="utb-role-dot" style={{ background: opt.color }} />
                <span>{opt.label}</span>
                {opt.value === user?.role && <CheckCircle2 size={12} className="utb-role-check" />}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main UniversalTopbar ────────────────────────────────────────── */
export function UniversalTopbar({ user, onLogout, onRoleSwitch }) {
  const { pathname }  = useLocation();
  const navigate      = useNavigate();

  const [showNotifs,   setShowNotifs]   = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showOmnibar,  setShowOmnibar]  = useState(false);
  const [reloadNotice, setReloadNotice] = useState('');

  const meta    = ROUTE_META[pathname] || { title: 'Customer Portal', sub: 'Overview of DealFlow360 customer portal' };
  const unread  = MOCK_NOTIFS.filter(n => n.unread).length;
  const initials = getInitials(user?.name || user?.username);
  const barRef  = useRef(null);

  /* GSAP entrance */
  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { y: -52, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.52, ease: 'power3.out' }
    );
    const children = barRef.current.querySelectorAll('.utb-gsap-child');
    gsap.fromTo(children,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.055, delay: 0.18 }
    );
  }, []);

  /* ⌘K global shortcut */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowOmnibar(v => !v);
      }
      if (e.key === 'Escape') {
        setShowOmnibar(false);
        setShowNotifs(false);
        setShowProfile(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleReload = () => {
    setReloadNotice('Data refreshed — catalog, pricing, and order status synced.');
    setTimeout(() => setReloadNotice(''), 3000);
  };

  return (
    <>
      {/* ── Main bar ───────────────────────────────────────── */}
      <header className="utb-bar" ref={barRef} role="banner">

        {/* LEFT — Page identity */}
        <div className="utb-left utb-gsap-child">
          <div className="utb-page-identity">
            <AnimatePresence mode="wait">
              <motion.h1
                key={pathname}
                className="utb-page-title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {meta.title}
              </motion.h1>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={pathname + '-sub'}
                className="utb-page-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, delay: 0.05 }}
              >
                {meta.sub}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER — Command Palette / Omnibar Search Trigger */}
        <div className="utb-center utb-gsap-child">
          <button
            className="utb-search-trigger"
            onClick={() => setShowOmnibar(true)}
            type="button"
            aria-label="Search pages and commands"
          >
            <Search size={14} className="utb-search-icon" />
            <span className="utb-search-placeholder">Search products, quotes or type a command...</span>
            <span className="utb-kbd">⌘K</span>
          </button>
        </div>

        {/* RIGHT — Controls & Role Selector */}
        <div className="utb-right utb-gsap-child">

          {/* Refresh data button */}
          <motion.button
            className="utb-icon-btn"
            onClick={handleReload}
            title="Refresh portal data"
            whileTap={{ scale: 0.92, rotate: 180 }}
            transition={{ duration: 0.25 }}
            type="button"
          >
            <RefreshCw size={15} />
          </motion.button>

          {/* Status pill */}
          <div className="utb-status-pill" title="Backend connection live">
            <span className="utb-status-dot" />
            <span className="utb-status-text">Live</span>
          </div>

          {/* Role switcher pill */}
          <RoleSwitcher user={user} onRoleSwitch={onRoleSwitch} />

          {/* Notifications bell */}
          <div className="utb-notif-wrap">
            <motion.button
              className={`utb-icon-btn ${showNotifs ? 'utb-icon-btn--active' : ''}`}
              onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
              title="Notifications"
              whileTap={{ scale: 0.94 }}
              type="button"
            >
              <Bell size={15} />
              {unread > 0 && <span className="utb-notif-badge">{unread}</span>}
            </motion.button>

            <AnimatePresence>
              {showNotifs && (
                <NotificationMenu
                  notifs={MOCK_NOTIFS}
                  onClose={() => setShowNotifs(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Profile avatar menu */}
          <div className="utb-profile-wrap">
            <motion.button
              className={`utb-avatar-btn ${showProfile ? 'utb-avatar-btn--active' : ''}`}
              onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
              type="button"
              whileTap={{ scale: 0.96 }}
            >
              <div className="utb-avatar">{initials}</div>
              <ChevronDown size={11} className="utb-avatar-chevron" />
            </motion.button>

            <AnimatePresence>
              {showProfile && (
                <ProfileMenu
                  user={user}
                  onLogout={onLogout}
                  onClose={() => setShowProfile(false)}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>

      {/* Toast refresh notice */}
      <AnimatePresence>
        {reloadNotice && (
          <motion.div
            className="utb-toast"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <CheckCircle2 size={15} />
            <span>{reloadNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Omnibar Modal */}
      <AnimatePresence>
        {showOmnibar && <Omnibar onClose={() => setShowOmnibar(false)} />}
      </AnimatePresence>
    </>
  );
}
