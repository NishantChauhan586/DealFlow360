/**
 * UniversalTopbar.jsx
 * DealFlow360 — Premium Universal Admin Top Navigation Bar
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
  Clock, ArrowRight, FileText,
} from 'lucide-react';
import { ROLES } from '../utils/permissions';
import './UniversalTopbar.css';

/* ─── Page metadata ──────────────────────────────────────────────── */
const ROUTE_META = {
  '/dashboard':     { title: 'Deal Health',          sub: 'Real-time view across every open quotation' },
  '/quotations':    { title: 'Quotations',            sub: 'Active deals and draft pipeline' },
  '/builder':       { title: 'Quotation Builder',    sub: 'Build and price new deals' },
  '/approval':      { title: 'Approvals',             sub: 'Pending and active approval workflows' },
  '/fulfillment':   { title: 'Fulfillment',           sub: 'Warehouse allocation and delivery tracking' },
  '/subscriptions': { title: 'Subscriptions',         sub: 'Recurring billing and renewal schedules' },
  '/reports':       { title: 'Sales Reports',         sub: 'Performance, attribution and margin analytics' },
  '/authorities':   { title: 'Authority Management', sub: 'Approval chains and permission governance' },
  '/products':      { title: 'Products & Pricing',   sub: 'Catalog, price lists and discount rules' },
};

/* ─── Role config ─────────────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: ROLES.ADMIN,         label: 'Admin',         color: '#00221C' },
  { value: ROLES.SALES_MANAGER, label: 'Sales Manager', color: '#1a5c4e' },
  { value: ROLES.SALES_REP,     label: 'Sales Rep',      color: '#2d7d6d' },
  { value: ROLES.FINANCE,       label: 'Finance & Ops',  color: '#3d6b5c' },
];

/* ─── Quick commands for omnibar ─────────────────────────────────── */
const QUICK_COMMANDS = [
  { id: 'new-quote',    icon: Plus,        label: 'New Quotation',       sub: 'Start a fresh quote',          path: '/builder',     shortcut: 'N' },
  { id: 'approvals',   icon: CheckCircle2, label: 'Go to Approvals',    sub: 'Review pending workflows',      path: '/approval',    shortcut: 'A' },
  { id: 'fulfillment', icon: Zap,          label: 'Fulfillment',         sub: 'Track orders and allocations', path: '/fulfillment', shortcut: 'F' },
  { id: 'reports',     icon: BarChart2,    label: 'Sales Reports',       sub: 'Analytics & performance',      path: '/reports',     shortcut: 'R' },
  { id: 'products',    icon: FileText,     label: 'Products & Pricing',  sub: 'Catalog management',           path: '/products',    shortcut: 'P' },
  { id: 'settings',    icon: Settings,     label: 'Authority Management',sub: 'Permissions & governance',     path: '/authorities', shortcut: 'S' },
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

  useEffect(() => { inputRef.current?.focus(); }, []);

  const execute = useCallback((cmd) => {
    navigate(cmd.path);
    onClose();
  }, [navigate, onClose]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter')     { if (filtered[selected]) execute(filtered[selected]); }
    if (e.key === 'Escape')    { onClose(); }
  };

  return (
    <motion.div
      className="utb-omnibar-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="utb-omnibar"
        initial={{ opacity: 0, y: -24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,   scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="utb-omnibar-input-row">
          <Search size={16} className="utb-omnibar-search-icon" />
          <input
            ref={inputRef}
            className="utb-omnibar-input"
            placeholder="Search pages, actions, deals…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKey}
            autoComplete="off"
          />
          <button className="utb-omnibar-esc" onClick={onClose} type="button">esc</button>
        </div>

        <div className="utb-omnibar-section-label">
          {query ? 'Results' : 'Quick Navigation'}
        </div>

        <ul className="utb-omnibar-list" role="listbox">
          {filtered.length === 0 && (
            <li className="utb-omnibar-empty">No results for &quot;{query}&quot;</li>
          )}
          {filtered.map((cmd, i) => (
            <motion.li
              key={cmd.id}
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className={`utb-omnibar-item ${i === selected ? 'utb-omnibar-item--selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => execute(cmd)}
              role="option"
            >
              <span className="utb-omnibar-item-icon"><cmd.icon size={15} /></span>
              <span className="utb-omnibar-item-text">
                <span className="utb-omnibar-item-label">{cmd.label}</span>
                <span className="utb-omnibar-item-sub">{cmd.sub}</span>
              </span>
              <span className="utb-omnibar-item-shortcut">{cmd.shortcut}</span>
            </motion.li>
          ))}
        </ul>

        <div className="utb-omnibar-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Notifications Panel ────────────────────────────────────────── */
function NotifPanel({ onClose }) {
  const ref = useRef(null);
  useClickOutside(ref, onClose);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unreadCount = notifs.filter(n => n.unread).length;

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
          <Bell size={13} />
          Notifications
          {unreadCount > 0 && <span className="utb-notif-count">{unreadCount}</span>}
        </div>
        {unreadCount > 0 && (
          <button
            className="utb-notif-mark-read"
            onClick={() => setNotifs(n => n.map(x => ({ ...x, unread: false })))}
            type="button"
          >
            Mark all read
          </button>
        )}
      </div>

      <ul className="utb-notif-list">
        {notifs.map((n, i) => (
          <motion.li
            key={n.id}
            custom={i}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className={`utb-notif-item ${n.unread ? 'utb-notif-item--unread' : ''}`}
          >
            <span className="utb-notif-icon" style={{ color: n.color }}><n.icon size={14} /></span>
            <span className="utb-notif-body">
              <span className="utb-notif-item-title">{n.title}</span>
              <span className="utb-notif-item-desc">{n.desc}</span>
            </span>
            <span className="utb-notif-time">{n.time}</span>
            {n.unread && <span className="utb-notif-dot" />}
          </motion.li>
        ))}
      </ul>

      <div className="utb-notif-footer">
        <button className="utb-notif-all-btn" type="button">
          View all notifications <ArrowRight size={12} />
        </button>
      </div>
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
          <div className="utb-profile-name">{user?.name || user?.username || 'User'}</div>
          <div className="utb-profile-email">{user?.email || 'internal@meridian.io'}</div>
        </div>
      </div>

      <div className="utb-menu-divider" />

      {[
        { icon: User,     label: 'My Profile' },
        { icon: Settings, label: 'Workspace Settings' },
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
        title="Switch demo role"
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
                onClick={() => { onRoleSwitch(opt.value); setOpen(false); }}
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

  const meta    = ROUTE_META[pathname] || { title: 'Dashboard', sub: 'Overview of DealFlow360 metrics' };
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
    setReloadNotice('Data refreshed — pricing, stock and approval rules synced.');
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

        {/* CENTER — Search / Command trigger */}
        <div className="utb-center utb-gsap-child">
          <motion.button
            className="utb-search-trigger"
            onClick={() => setShowOmnibar(true)}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Open command palette (Ctrl+K)"
          >
            <Search size={13} className="utb-search-icon" />
            <span className="utb-search-placeholder">Search pages, quotes, contacts…</span>
            <kbd className="utb-kbd">⌘K</kbd>
          </motion.button>
        </div>

        {/* RIGHT — Controls */}
        <div className="utb-right">

          {/* Live status */}
          <motion.div
            className="utb-status-pill utb-gsap-child"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            title="All systems operational"
          >
            <span className="utb-status-dot" />
            <span className="utb-status-text">Live</span>
          </motion.div>

          {/* Reload data */}
          <motion.button
            className="utb-icon-btn utb-gsap-child"
            onClick={handleReload}
            type="button"
            title="Reload backend data"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92, rotate: 160 }}
            transition={{ duration: 0.28 }}
          >
            <RefreshCw size={15} />
          </motion.button>



          {/* Notifications */}
          <div className="utb-notif-wrap utb-gsap-child">
            <motion.button
              className={`utb-icon-btn ${showNotifs ? 'utb-icon-btn--active' : ''}`}
              onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
              type="button"
              aria-label={`Notifications, ${unread} unread`}
              aria-expanded={showNotifs}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <Bell size={15} />
              {unread > 0 && (
                <motion.span
                  className="utb-notif-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                >
                  {unread}
                </motion.span>
              )}
            </motion.button>
            <AnimatePresence>
              {showNotifs && <NotifPanel onClose={() => setShowNotifs(false)} />}
            </AnimatePresence>
          </div>

          {/* Role switcher */}
          {onRoleSwitch && user && (
            <div className="utb-gsap-child">
              <RoleSwitcher user={user} onRoleSwitch={onRoleSwitch} />
            </div>
          )}

          {/* Profile */}
          <div className="utb-profile-wrap utb-gsap-child">
            <motion.button
              className={`utb-avatar-btn ${showProfile ? 'utb-avatar-btn--active' : ''}`}
              onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
              type="button"
              aria-label="User menu"
              aria-expanded={showProfile}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              <span className="utb-avatar">{initials}</span>
              <motion.span
                animate={{ rotate: showProfile ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="utb-avatar-chevron"
              >
                <ChevronDown size={11} />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {showProfile && (
                <ProfileMenu user={user} onLogout={onLogout} onClose={() => setShowProfile(false)} />
              )}
            </AnimatePresence>
          </div>

        </div>
      </header>


      {/* ── Reload toast ─────────────────────────────────────── */}
      <AnimatePresence>
        {reloadNotice && (
          <motion.div
            className="utb-toast"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <CheckCircle2 size={14} />
            {reloadNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Omnibar ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showOmnibar && <Omnibar onClose={() => setShowOmnibar(false)} />}
      </AnimatePresence>
    </>
  );
}
