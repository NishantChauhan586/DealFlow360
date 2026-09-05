import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Mail, 
  CreditCard, 
  Users, 
  Plus, 
  RotateCw, 
  CheckCircle2, 
  Boxes,
  Trash2
} from 'lucide-react';
import styles from '../../pages/AuthorityManagement.module.css';

const DEFAULT_AUTHORITIES = [
  {
    id: 'AUTH-001',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Sales Manager / Approver'
  }
];

const STORAGE_KEY = 'dealflow_provisioned_authorities';

export default function AuthorityManagement() {
  const [authorities, setAuthorities] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_AUTHORITIES;
    } catch {
      return DEFAULT_AUTHORITIES;
    }
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Representative');
  const [notification, setNotification] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  // Compute next Authority ID
  const nextIdNumber = authorities.length + 1;
  const currentAuthId = `AUTH-${String(nextIdNumber).padStart(3, '0')}`;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authorities));
    } catch (e) {
      console.error(e);
    }
  }, [authorities]);

  const handleAppoint = (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setNotification('Please enter full name.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    if (!email.trim()) {
      setNotification('Please enter official email.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    const newAuthority = {
      id: currentAuthId,
      name: fullName.trim(),
      email: email.trim(),
      role: role
    };

    setAuthorities(prev => [newAuthority, ...prev]);
    setNotification(`Authority ${newAuthority.id} appointed successfully.`);
    setFullName('');
    setEmail('');
    setRole('Sales Representative');

    setTimeout(() => {
      setNotification('');
    }, 4000);
  };

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        setAuthorities(saved ? JSON.parse(saved) : DEFAULT_AUTHORITIES);
      } catch {
        setAuthorities(DEFAULT_AUTHORITIES);
      }
      setIsRotating(false);
    }, 400);
  };

  const handleDelete = (id) => {
    setAuthorities(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className={styles.adminSection}>
      
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.eyebrow}>Administration</div>
          <h2 className={styles.title}>Authority management</h2>
          <p className={styles.subtitle}>
            Only admins can provision internal authorities. Customers remain self-service; every authority receives an official email and unique authority ID.
          </p>
        </div>
        <div className={styles.topIcon}>
          <Boxes size={28} />
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.gridTwoCol}>
        
        {/* Left Form */}
        <div className={styles.formCard}>
          <form onSubmit={handleAppoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div className={styles.formGrid}>
              {/* Full name */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <UserPlus size={14} />
                  <span>Full name</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={styles.input}
                />
              </div>

              {/* Official email */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <Mail size={14} />
                  <span>Official email</span>
                </label>
                <input 
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                />
              </div>

              {/* Authority ID */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <CreditCard size={14} />
                  <span>Authority ID</span>
                </label>
                <input 
                  type="text"
                  value={currentAuthId}
                  disabled
                  className={styles.input}
                  style={{ background: '#F5F7F6', color: 'var(--burnham)', fontWeight: 600, fontFamily: 'monospace' }}
                />
              </div>

              {/* Role */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <Users size={14} />
                  <span>Role</span>
                </label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className={styles.select}
                >
                  <option value="Sales Representative">Sales Representative</option>
                  <option value="Sales Manager / Approver">Sales Manager / Approver</option>
                  <option value="Finance / Operation User">Finance / Operation User</option>
                </select>
              </div>
            </div>

            {/* Appoint Button */}
            <button type="submit" className={styles.appointBtn}>
              <Plus size={16} />
              <span>Appoint authority</span>
            </button>

            {/* Notification Banner */}
            <AnimatePresence>
              {notification && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.successBanner}
                >
                  <CheckCircle2 size={15} color="#438A7E" />
                  <span>{notification}</span>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </div>

        {/* Right List Panel */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>Provisioned authorities</h3>
            <button 
              type="button" 
              onClick={handleRefresh}
              className={styles.refreshBtn}
              title="Refresh list"
            >
              <RotateCw size={14} style={{ transform: isRotating ? 'rotate(360deg)' : 'none', transition: 'transform 0.4s ease' }} />
            </button>
          </div>

          <div className={styles.authoritiesList}>
            {authorities.map((auth) => (
              <div key={auth.id} className={styles.authorityRow}>
                <div>
                  <div className={styles.authorityName}>{auth.name}</div>
                  <div className={styles.authorityEmail}>{auth.email}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className={styles.tagAuth}>{auth.id}</span>
                  <span className={styles.roleText}>{auth.role}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDelete(auth.id)}
                    className={styles.deleteBtn}
                    title="Revoke authority"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
