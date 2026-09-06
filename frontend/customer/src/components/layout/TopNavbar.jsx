import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Menu,
  X,
  Check,
} from 'lucide-react';
import styles from './TopNavbar.module.css';

const PAGE_TITLES = {
  '/':              'Dashboard',
  '/deals':         'Deals',
  '/pipeline':      'Pipeline',
  '/contacts':      'Contacts',
  '/companies':     'Companies',
  '/activities':    'Activities',
  '/tasks':         'Tasks',
  '/analytics':     'Analytics',
  '/ai-assistant':  'AI Assistant',
  '/settings':      'Settings',
};

const MOCK_NOTIFICATIONS = [];

function NotificationsPanel({ onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className={styles.notifPanel} ref={panelRef} role="dialog" aria-label="Notifications">
      <div className={styles.notifHeader}>
        <span>Notifications</span>
        <button type="button" className={styles.markRead} onClick={onClose}>
          <Check size={12} aria-hidden="true" /> Mark all read
        </button>
      </div>
      <ul className={styles.notifList} role="list">
        {MOCK_NOTIFICATIONS.length === 0 ? (
          <li className={styles.notifItem} style={{ fontStyle: 'italic', color: 'var(--ink-60)', justifyContent: 'center' }}>
            No new notifications
          </li>
        ) : (
          MOCK_NOTIFICATIONS.map((n) => (
            <li key={n.id} className={`${styles.notifItem} ${n.unread ? styles.unread : ''}`}>
              <span className={styles.notifText}>{n.text}</span>
              <span className={styles.notifTime}>{n.time}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ProfileMenu({ onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className={styles.profileMenu} ref={menuRef} role="menu">
      <div className={styles.profileMenuHeader}>
        <div className={styles.profileAvatar}>AK</div>
        <div>
          <p className={styles.profileName}>Alex Kim</p>
          <p className={styles.profileEmail}>alex@dealflow360.com</p>
        </div>
      </div>
      <hr className={styles.menuDivider} />
      {['Profile', 'Team Settings', 'Billing', 'Sign out'].map((item) => (
        <button key={item} type="button" className={styles.menuItem} role="menuitem">
          {item}
        </button>
      ))}
    </div>
  );
}

export function TopNavbar({ onMobileMenuToggle, mobileMenuOpen }) {
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const title = PAGE_TITLES[location.pathname] ?? 'DealFlow360';
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <header className={styles.navbar} role="banner">
      {/* Mobile menu toggle */}
      <button
        type="button"
        className={styles.mobileToggle}
        onClick={onMobileMenuToggle}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Page title */}
      <div className={styles.titleArea}>
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>

      {/* Right side controls */}
      <div className={styles.controls}>
        {/* Search */}
        <div className={`${styles.searchWrap} ${searchFocused ? styles.searchFocused : ''}`}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search deals, contacts…"
            className={styles.searchInput}
            aria-label="Search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>

        {/* Quick action */}
        <button
          type="button"
          className={styles.quickAction}
          aria-label="Create new deal"
          title="New Deal"
        >
          <Plus size={15} aria-hidden="true" />
          <span>New Deal</span>
        </button>

        {/* Notifications */}
        <div className={styles.notifWrap}>
          <button
            type="button"
            className={`${styles.iconBtn} ${showNotifs ? styles.active : ''}`}
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={showNotifs}
            onClick={() => {
              setShowNotifs((v) => !v);
              setShowProfile(false);
            }}
          >
            <Bell size={16} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className={styles.notifBadge} aria-hidden="true">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
        </div>

        {/* Profile */}
        <div className={styles.profileWrap}>
          <button
            type="button"
            className={`${styles.profileBtn} ${showProfile ? styles.active : ''}`}
            aria-label="User menu"
            aria-expanded={showProfile}
            onClick={() => {
              setShowProfile((v) => !v);
              setShowNotifs(false);
            }}
          >
            <span className={styles.profileAvatar}>AK</span>
            <ChevronDown size={12} className={styles.profileChevron} aria-hidden="true" />
          </button>
          {showProfile && <ProfileMenu onClose={() => setShowProfile(false)} />}
        </div>
      </div>
    </header>
  );
}
